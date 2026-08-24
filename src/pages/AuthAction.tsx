import { FormEvent, useEffect, useState } from "react";

import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "../firebase/firebase";

type Status =
  | "loading"
  | "reset"
  | "verified"
  | "recovered"
  | "success"
  | "error";

export default function AuthAction() {
  const params = new URLSearchParams(window.location.search);

  const mode = params.get("mode");
  const actionCode = params.get("oobCode");
  const continueUrl = params.get("continueUrl");

  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mode || !actionCode) {
      setMessage(
        "This action link is invalid or incomplete. Please request a new link."
      );
      setStatus("error");
      return;
    }

    const code = actionCode;
    const actionMode = mode;

    async function handleAction() {
      try {
        switch (actionMode) {
          case "resetPassword": {
            const accountEmail = await verifyPasswordResetCode(
              auth,
              code
            );

            setEmail(accountEmail);
            setStatus("reset");

            break;
          }

          case "verifyEmail": {
            await applyActionCode(auth, code);

            setStatus("verified");

            break;
          }

          case "recoverEmail": {
            const info = await checkActionCode(
              auth,
              code
            );

            setEmail(info.data.email || "");

            await applyActionCode(
              auth,
              code
            );

            setStatus("recovered");

            break;
          }

          default: {
            setMessage(
              "This email action is not supported."
            );

            setStatus("error");

            break;
          }
        }
      } catch (error: unknown) {
        console.error(
          "Firebase action error:",
          error
        );

        const firebaseError =
          error as {
            code?: string;
          };

        if (
          firebaseError.code ===
            "auth/expired-action-code" ||
          firebaseError.code ===
            "auth/invalid-action-code"
        ) {
          setMessage(
            "This link has expired or has already been used. Please request a new one."
          );
        } else if (
          firebaseError.code ===
          "auth/user-disabled"
        ) {
          setMessage(
            "This account has been disabled."
          );
        } else if (
          firebaseError.code ===
          "auth/user-not-found"
        ) {
          setMessage(
            "We could not find the account associated with this link."
          );
        } else {
          setMessage(
            "We could not complete this request. Please try again or request a new link."
          );
        }

        setStatus("error");
      }
    }

    handleAction();
  }, [mode, actionCode]);

  async function handlePasswordReset(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!actionCode) {
      setMessage(
        "This password reset link is invalid."
      );
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "The passwords do not match."
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      await confirmPasswordReset(
        auth,
        actionCode,
        password
      );

      setStatus("success");
    } catch (error: unknown) {
      console.error(
        "Password reset error:",
        error
      );

      const firebaseError =
        error as {
          code?: string;
        };

      if (
        firebaseError.code ===
          "auth/expired-action-code" ||
        firebaseError.code ===
          "auth/invalid-action-code"
      ) {
        setMessage(
          "This password reset link has expired. Please request a new one."
        );
      } else if (
        firebaseError.code ===
        "auth/weak-password"
      ) {
        setMessage(
          "Please choose a stronger password."
        );
      } else {
        setMessage(
          "Unable to reset your password. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function getDestination() {
    if (!continueUrl) {
      return "/";
    }

    try {
      const url = new URL(
        continueUrl
      );

      if (
        url.hostname ===
          "runtime.co.zw" ||
        url.hostname.endsWith(
          ".runtime.co.zw"
        )
      ) {
        return continueUrl;
      }
    } catch {
      // Ignore malformed continue URLs.
    }

    return "/";
  }

  if (status === "loading") {
    return (
      <PageContainer>
        <div className="text-center">
          <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

          <p className="mb-2 text-sm font-medium text-gray-500">
            Runtime
          </p>

          <h1 className="text-2xl font-semibold text-gray-950">
            Checking your link
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Please wait while we verify your request.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (status === "reset") {
    return (
      <PageContainer>
        <p className="mb-2 text-sm font-medium text-gray-500">
          Runtime
        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          Create a new password
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Enter a new password for{" "}
          <span className="font-medium text-gray-700">
            {email}
          </span>
          .
        </p>

        <form
          onSubmit={handlePasswordReset}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              New password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Enter new password"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Repeat new password"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-900"
            />
          </div>

          {message && (
            <div className="rounded-xl bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">
                {message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Updating password..."
              : "Update password"}
          </button>
        </form>
      </PageContainer>
    );
  }

  if (status === "verified") {
    return (
      <SuccessPage
        title="Email verified"
        description="Your email address has been successfully verified."
        destination={getDestination()}
      />
    );
  }

  if (status === "recovered") {
    return (
      <SuccessPage
        title="Email restored"
        description={
          email
            ? `Your account email has been restored to ${email}.`
            : "Your previous account email has been restored."
        }
        destination={getDestination()}
      />
    );
  }

  if (status === "success") {
    return (
      <SuccessPage
        title="Password updated"
        description="Your password has been changed successfully. You can now sign in with your new password."
        destination={getDestination()}
      />
    );
  }

  return (
    <PageContainer>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-700">
        !
      </div>

      <p className="mt-6 mb-2 text-sm font-medium text-gray-500">
        Runtime
      </p>

      <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
        Link unavailable
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-500">
        {message}
      </p>

      <a
        href="/"
        className="mt-8 flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
      >
        Return to Runtime
      </a>
    </PageContainer>
  );
}

function SuccessPage({
  title,
  description,
  destination,
}: {
  title: string;
  description: string;
  destination: string;
}) {
  return (
    <PageContainer>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl text-white">
        ✓
      </div>

      <p className="mt-6 mb-2 text-sm font-medium text-gray-500">
        Runtime
      </p>

      <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
        {title}
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <a
        href={destination}
        className="mt-8 flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
      >
        Continue to Runtime
      </a>
    </PageContainer>
  );
}

function PageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        {children}
      </div>
    </main>
  );
}