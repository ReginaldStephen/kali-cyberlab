import React, { FormEvent, useEffect, useState } from "react";

interface LoginProps {
  onLogin: (user: any) => void;
}

const backgroundImages = [
  "/images/CUCyberpic.jpg",
  "/images/PedriCyber.jpeg",
];

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [authStep, setAuthStep] = useState("");

  /*
   * CyberLab login background slideshow
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentImage((previous) => (previous + 1) % backgroundImages.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  /*
   * Authentication status animation
   */
  useEffect(() => {
    if (!isLoading) {
      setAuthStep("");
      return;
    }

    setAuthStep("INITIALIZING SECURE SESSION...");

    const stepOne = window.setTimeout(() => {
      setAuthStep("VERIFYING CREDENTIALS...");
    }, 700);

    const stepTwo = window.setTimeout(() => {
      setAuthStep("ESTABLISHING CYBERLAB SESSION...");
    }, 1400);

    const stepThree = window.setTimeout(() => {
      setAuthStep("ACCESSING SECURITY OPERATIONS...");
    }, 2100);

    return () => {
      window.clearTimeout(stepOne);
      window.clearTimeout(stepTwo);
      window.clearTimeout(stepThree);
    };
  }, [isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json    ().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Invalid username or password."
        );
      }

      if (!data?.authenticated || !data?.user) {
        throw new Error("Authentication failed.");
      }

      setAuthStep("ACCESS GRANTED");

      window.setTimeout(() => {
        onLogin(data.user);
      }, 350);
    } catch (err: any) {
      setError(err?.message || "Unable to sign in.");
      setAuthStep("ACCESS DENIED");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-mono text-slate-200">

      {/* ============================================================
          BACKGROUND SLIDESHOW
      ============================================================ */}

      <div className="absolute inset-0">
        {backgroundImages.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${
              currentImage === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center transition-transform duration-[9000ms] ease-linear ${
                currentImage === index
                  ? "scale-110"
                  : "scale-100"
              }`}
              style={{
                backgroundImage: `url("${image}")`,
              }}
            />
          </div>
        ))}
      </div>

      {/* ============================================================
          DARK SOC OVERLAY
      ============================================================ */}

      <div className="absolute inset-0 bg-black/65" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(127,29,29,0.18), rgba(0,0,0,0.72) 60%, rgba(0,0,0,0.94) 100%)",
        }}
      />

      {/* ============================================================
          RED CYBERLAB LIGHTING
      ============================================================ */}

      <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-red-700/10 blur-[120px]" />

      <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-red-700/10 blur-[120px]" />

      {/* ============================================================
          CYBER GRID
      ============================================================ */}

      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,113,113,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(248,113,113,0.25) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* ============================================================
          SCANLINE EFFECT
      ============================================================ */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.15) 4px)",
        }}
      />

      {/* ============================================================
          TOP STATUS BAR
      ============================================================ */}

      <div className="absolute left-0 right-0 top-0 z-20 border-b border-red-500/10 bg-black/25 px-5 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[8px] uppercase tracking-[0.25em] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 shadow-lg shadow-red-500/70" />
            <span>CyberLab Security Network</span>
          </div>

          <div className="hidden gap-6 sm:flex">
            <span>NODE: CU-CYBERLAB</span>
            <span>STATUS: ONLINE</span>
            <span>ENCRYPTION: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-20">

        <div className="w-full max-w-md">

          {/* ========================================================
              BRAND
          ======================================================== */}

          <div className="mb-7 text-center">

            <div className="mb-5 inline-flex items-center justify-center">

              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/40 bg-black/50 shadow-2xl shadow-red-950/50 backdrop-blur-xl">

                <div className="absolute inset-2 rounded-xl border border-red-500/20" />

                <div className="absolute h-10 w-10 rounded-full border border-red-500/60" />

                <div className="absolute h-6 w-6 rounded-full border-2 border-red-500 shadow-lg shadow-red-500/50" />

                <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.9)]" />

              </div>

            </div>

            <h1 className="text-3xl font-black tracking-[0.16em] text-white drop-shadow-2xl sm:text-4xl">
              KALI{" "}
              <span className="text-red-500">
                CYBERLAB
              </span>
            </h1>

            <p className="mt-2 text-[9px] uppercase tracking-[0.38em] text-slate-400">
              Security Operations Suite
            </p>

          </div>

          {/* ========================================================
              LOGIN PANEL
          ======================================================== */}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/65 shadow-2xl shadow-black/70 backdrop-blur-2xl">

            {/* Panel top line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            {/* Header */}
            <div className="border-b border-white/10 px-6 py-5">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="relative">
                    <span className="block h-2 w-2 rounded-full bg-red-500 shadow-lg shadow-red-500/70" />
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-30" />
                  </div>

                  <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                      Authorized Access
                    </h2>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-slate-500">
                      CyberLab Operations Console
                    </p>
                  </div>

                </div>

                <div className="text-right text-[7px] uppercase tracking-[0.15em] text-slate-600">
                  <div>SECURE</div>
                  <div className="mt-1 text-emerald-500/70">
                    ONLINE
                  </div>
                </div>

              </div>

            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-7"
            >

              {/* Error */}
              {error && (
                <div className="mb-5 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 shadow-lg shadow-red-950/20">

                  <div className="flex items-start gap-3">

                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-red-500/50 bg-red-500/10 text-[10px] font-bold text-red-400">
                      !
                    </div>

                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-red-400">
                        Authentication Error
                      </div>

                      <div className="mt-1 text-xs text-red-300">
                        {error}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Username */}
              <div className="mb-5">

                <label
                  htmlFor="cyberlab-username"
                  className="mb-2 block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400"
                >
                  Operator Username
                </label>

                <div className="group relative">

                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center border-r border-slate-800 text-slate-600 transition group-focus-within:border-red-500/30 group-focus-within:text-red-500">
                    <span className="text-xs">
                      &gt;_
                    </span>
                  </div>

                  <input
                    id="cyberlab-username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    autoComplete="username"
                    autoFocus
                    disabled={isLoading}
                    placeholder="Enter operator username"
                    className="w-full rounded-lg border border-slate-800 bg-black/50 py-3.5 pl-14 pr-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-red-500/60 focus:bg-black/70 focus:ring-1 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                </div>

              </div>

              {/* Password */}
              <div className="mb-6">

                <label
                  htmlFor="cyberlab-password"
                  className="mb-2 block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400"
                >
                  Security Credential
                </label>

                <div className="group relative">

                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center border-r border-slate-800 text-slate-600 transition group-focus-within:border-red-500/30 group-focus-within:text-red-500">
                    <span className="text-xs">
                      ●●
                    </span>
                  </div>

                  <input
                    id="cyberlab-password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    disabled={isLoading}
                    placeholder="Enter security credential"
                    className="w-full rounded-lg border border-slate-800 bg-black/50 py-3.5 pl-14 pr-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-red-500/60 focus:bg-black/70 focus:ring-1 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                </div>

              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-lg border border-red-500/50 bg-red-700/90 px-4 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-red-950/30 transition duration-300 hover:border-red-400 hover:bg-red-600 hover:shadow-xl hover:shadow-red-900/40 disabled:cursor-not-allowed disabled:opacity-70"
              >

                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                <span className="relative z-10 flex items-center justify-center gap-3">

                  {isLoading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      AUTHENTICATING
                    </>
                  ) : (
                    <>
                      <span>◈</span>
                      LOGIN TO CYBERLAB
                      <span>→</span>
                    </>
                  )}

                </span>

              </button>

              {/* Authentication sequence */}
              {isLoading && (
                <div className="mt-5 rounded-lg border border-red-500/10 bg-red-950/10 px-4 py-3">

                  <div className="flex items-center gap-2">

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />

                    <span className="text-[8px] uppercase tracking-[0.18em] text-red-400">
                      {authStep}
                    </span>

                  </div>

                  <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-slate-800">

                    <div className="h-full w-1/2 animate-pulse bg-red-500 shadow-lg shadow-red-500" />

                  </div>

                </div>
              )}

              {/* Security status */}
              {!isLoading && (
                <div className="mt-6 flex items-center justify-center gap-2 text-[8px] uppercase tracking-[0.18em] text-slate-600">

                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />

                  Secure authentication channel

                </div>
              )}

            </form>

          </div>

          {/* ========================================================
              IMAGE INDICATOR
          ======================================================== */}

          <div className="mt-5 flex items-center justify-center gap-2">

            {backgroundImages.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setCurrentImage(index)}
                aria-label={`Show background ${index + 1}`}
                className={`h-1 rounded-full transition-all duration-500 ${
                  currentImage === index
                    ? "w-7 bg-red-500 shadow-lg shadow-red-500/50"
                    : "w-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}

          </div>

          {/* ========================================================
              FOOTER
          ======================================================== */}

          <div className="mt-6 text-center">

            <p className="text-[8px] uppercase tracking-[0.28em] text-white/30">
              Authorized Personnel Only
            </p>

            <p className="mt-2 text-[7px] uppercase tracking-[0.2em] text-white/15">
              KALI CYBERLAB • SECURITY OPERATIONS
            </p>

          </div>

        </div>

      </div>

      {/* ============================================================
          CORNER HUD DETAILS
      ============================================================ */}

      <div className="pointer-events-none absolute bottom-5 left-5 hidden text-[7px] uppercase tracking-[0.2em] text-white/20 sm:block">
        <div>SYS::CYBERLAB</div>
        <div className="mt-1">AUTH::SECURE</div>
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 hidden text-right text-[7px] uppercase tracking-[0.2em] text-white/20 sm:block">
        <div>THREAT::MONITORING</div>
        <div className="mt-1">NETWORK::ACTIVE</div>
      </div>

    </div>
  );
}