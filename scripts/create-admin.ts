import "dotenv/config";
import * as mysql from "mysql2/promise";
import * as crypto from "crypto";
import * as readline from "readline";

const db = mysql.createPool({
  host: process.env.CYBERLAB_DB_HOST || "127.0.0.1",
  port: Number(process.env.CYBERLAB_DB_PORT) || 3306,
  database: process.env.CYBERLAB_DB_NAME || "cyberlab",
  user: process.env.CYBERLAB_DB_USER || "cyberlab_app",
  password: process.env.CYBERLAB_DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0,
});

function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16);

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `scrypt$${salt.toString("hex")}$${hash}`;
}

function ask(
  rl: readline.Interface,
  question: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askPassword(
  question: string
): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Password input requires an interactive terminal."
    );
  }

  return new Promise((resolve) => {
    process.stdout.write(question);

    let password = "";

    const onData = (data: Buffer) => {
      const char = data.toString();

      if (char === "\n" || char === "\r") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener(
          "data",
          onData
        );

        process.stdout.write("\n");
        resolve(password);
        return;
      }

      if (char === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener(
          "data",
          onData
        );

        process.stdout.write("\n");
        process.exit(1);
      }

      if (char === "\u007f") {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }

        return;
      }

      password += char;
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      " Kali CyberLab - Super Administrator Setup"
    );
    console.log(
      "=============================================="
    );
    console.log("");

    const username = await ask(
      rl,
      "Username: "
    );

    const displayName = await ask(
      rl,
      "Display name: "
    );

    const email = await ask(
      rl,
      "Email (optional): "
    );

    rl.close();

    const password = await askPassword(
      "Password: "
    );

    const confirmPassword = await askPassword(
      "Confirm password: "
    );

    if (!username) {
      throw new Error(
        "Username cannot be empty."
      );
    }

    if (!displayName) {
      throw new Error(
        "Display name cannot be empty."
      );
    }

    if (password.length < 12) {
      throw new Error(
        "Password must be at least 12 characters long."
      );
    }

    if (password !== confirmPassword) {
      throw new Error(
        "Passwords do not match."
      );
    }

    const [existingRows] =
      await db.execute(
        `
          SELECT id
          FROM users
          WHERE username = ?
          LIMIT 1
        `,
        [username]
      );

    if (
      (existingRows as Array<{ id: number }>).length >
      0
    ) {
      throw new Error(
        `Username "${username}" already exists.`
      );
    }

    const passwordHash =
      createPasswordHash(password);

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] =
        await connection.execute(
          `
            INSERT INTO users
              (
                username,
                email,
                display_name,
                password_hash,
                is_active
              )
            VALUES
              (?, ?, ?, ?, TRUE)
          `,
          [
            username,
            email || null,
            displayName,
            passwordHash,
          ]
        );

      const userId = Number(
        (userResult as any).insertId
      );

      const [roleRows] =
        await connection.execute(
          `
            SELECT id
            FROM roles
            WHERE name = 'Super Administrator'
            LIMIT 1
          `
        );

      const role =
        (roleRows as Array<{ id: number }>)[0];

      if (!role) {
        throw new Error(
          "Super Administrator role does not exist."
        );
      }

      await connection.execute(
        `
          INSERT INTO user_roles
            (
              user_id,
              role_id
            )
          VALUES
            (?, ?)
        `,
        [userId, role.id]
      );

      await connection.execute(
        `
          INSERT INTO audit_logs
            (
              user_id,
              action,
              resource_type,
              resource_id,
              details
            )
          VALUES
            (?, ?, ?, ?, ?)
        `,
        [
          userId,
          "auth.admin_created",
          "user",
          String(userId),
          "Initial Super Administrator account created.",
        ]
      );

      await connection.commit();

      console.log("");
      console.log(
        "[+] Super Administrator created successfully."
      );
      console.log(
        `[+] Username: ${username}`
      );
      console.log(
        `[+] User ID: ${userId}`
      );
      console.log(
        "[+] Role: Super Administrator"
      );
      console.log("");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } finally {
    rl.close();
    await db.end();
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    "[!] Admin creation failed:"
  );
  console.error(
    error instanceof Error
      ? error.message
      : error
  );
  console.error("");
  process.exit(1);
});
