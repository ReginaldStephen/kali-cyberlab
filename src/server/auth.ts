import * as crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import type { Pool } from "mysql2/promise";

export type AuthUser = {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
};

type SessionRecord = {
  userId: number;
  username: string;
  email: string | null;
  displayName: string;
  isActive: number;
  roles: string;
  permissions: string;
};

declare global {
  namespace Express {
    interface Request {
      cyberLabUser?: AuthUser;
    }
  }
}

function hashSessionToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(password: string, salt: Buffer): string {
  return crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
}

export function createPasswordHash(password: string): string {
  if (password.length < 12) {
    throw new Error(
      "Password must be at least 12 characters long."
    );
  }

  const salt = crypto.randomBytes(16);
  const hash = hashPassword(password, salt);

  return `scrypt$${salt.toString("hex")}$${hash}`;
}

export function verifyPassword(
  password: string,
  storedHash: string
): boolean {
  try {
    const parts = storedHash.split("$");

    if (
      parts.length !== 3 ||
      parts[0] !== "scrypt"
    ) {
      return false;
    }

    const salt = Buffer.from(parts[1], "hex");
    const expectedHash = Buffer.from(parts[2], "hex");

    const actualHash = Buffer.from(
      hashPassword(password, salt),
      "hex"
    );

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      actualHash,
      expectedHash
    );
  } catch {
    return false;
  }
}

function getSessionToken(req: Request): string | null {
  const cookies = req.headers.cookie;

  if (!cookies) {
    return null;
  }

  const match = cookies.match(
    /(?:^|;\s*)cyberlab_session=([^;]+)/
  );

  return match?.[1] || null;
}

function setSessionCookie(
  res: Response,
  token: string
): void {
  const secure =
    process.env.COOKIE_SECURE === "true";

  const cookieParts = [
    `cyberlab_session=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=28800",
  ];

  if (secure) {
    cookieParts.push("Secure");
  }

  res.setHeader(
    "Set-Cookie",
    cookieParts.join("; ")
  );
}

export function clearSessionCookie(
  res: Response
): void {
  res.setHeader(
    "Set-Cookie",
    "cyberlab_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
  );
}

export async function createSession(
  db: Pool,
  userId: number,
  req: Request,
  res: Response
): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);

  await db.execute(
    `
      INSERT INTO sessions
        (
          user_id,
          token_hash,
          expires_at,
          ip_address,
          user_agent
        )
      VALUES
        (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR), ?, ?)
    `,
    [
      userId,
      tokenHash,
      req.ip || null,
      req.get("user-agent") || null,
    ]
  );

  setSessionCookie(res, token);
}

export async function destroySession(
  db: Pool,
  req: Request
): Promise<void> {
  const token = getSessionToken(req);

  if (!token) {
    return;
  }

  const tokenHash = hashSessionToken(token);

  await db.execute(
    "DELETE FROM sessions WHERE token_hash = ?",
    [tokenHash]
  );
}

export async function authenticate(
  db: Pool,
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getSessionToken(req);

    if (!token) {
      return next();
    }

    const tokenHash = hashSessionToken(token);

    const [rows] = await db.execute(
      `
        SELECT
          u.id AS userId,
          u.username,
          u.email,
          u.display_name AS displayName,
          u.is_active AS isActive,
          GROUP_CONCAT(
            DISTINCT r.name
            ORDER BY r.name
            SEPARATOR ','
          ) AS roles,
          GROUP_CONCAT(
            DISTINCT p.name
            ORDER BY p.name
            SEPARATOR ','
          ) AS permissions
        FROM sessions s
        JOIN users u
          ON u.id = s.user_id
        LEFT JOIN user_roles ur
          ON ur.user_id = u.id
        LEFT JOIN roles r
          ON r.id = ur.role_id
        LEFT JOIN role_permissions rp
          ON rp.role_id = r.id
        LEFT JOIN permissions p
          ON p.id = rp.permission_id
        WHERE
          s.token_hash = ?
          AND s.expires_at > NOW()
          AND u.is_active = TRUE
        GROUP BY
          u.id,
          u.username,
          u.email,
          u.display_name,
          u.is_active
        LIMIT 1
      `,
      [tokenHash]
    );

    const session =
      (rows as SessionRecord[])[0];

    if (!session) {
      return next();
    }

    await db.execute(
      `
        UPDATE sessions
        SET last_seen_at = NOW()
        WHERE token_hash = ?
      `,
      [tokenHash]
    );

    req.cyberLabUser = {
      id: Number(session.userId),
      username: session.username,
      email: session.email,
      displayName: session.displayName,
      isActive: Boolean(session.isActive),
      roles: session.roles
        ? session.roles.split(",")
        : [],
      permissions: session.permissions
        ? session.permissions.split(",")
        : [],
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.cyberLabUser) {
    res.status(401).json({
      error: "Authentication required.",
    });
    return;
  }

  next();
}

export function requirePermission(
  permission: string
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.cyberLabUser) {
      res.status(401).json({
        error: "Authentication required.",
      });
      return;
    }

    if (
      !req.cyberLabUser.permissions.includes(
        permission
      )
    ) {
      res.status(403).json({
        error: "Permission denied.",
        requiredPermission: permission,
      });
      return;
    }

    next();
  };
}

export async function auditLog(
  db: Pool,
  req: Request,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: string
): Promise<void> {
  await db.execute(
    `
      INSERT INTO audit_logs
        (
          user_id,
          action,
          resource_type,
          resource_id,
          details,
          ip_address
        )
      VALUES
        (?, ?, ?, ?, ?, ?)
    `,
    [
      req.cyberLabUser?.id || null,
      action,
      resourceType || null,
      resourceId || null,
      details || null,
      req.ip || null,
    ]
  );
}
