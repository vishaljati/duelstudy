
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  validateLogin,
  validateSignup,
} from "../lib/auth";

import userService from "../services/user.service.js";

const AuthContext = createContext(null);

// Normalize MongoDB user data for existing frontend components.
const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    id: user._id || user.id,
  };
};

// Extract user from your ApiResponse structure.
const extractUser = (response) => {
  const data = response?.data;

  return normalizeUser(data?.user || data);
};

// Convert backend errors into frontend form errors.
const getApiErrors = (error) => {
  const message =
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again.";

  return { form: message };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authentication when the application starts.
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const response = await userService.getCurrentUser();

        if (active) {
          setUser(extractUser(response));
        }
      } catch (error) {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  // Register new user.
  const signup = useCallback(async (input) => {
    const errors = validateSignup(input);

    if (Object.keys(errors).length) {
      return { ok: false, errors };
    }

    try {
      const response = await userService.registerUser({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        goal: input.goal,
      });

      const newUser = extractUser(response);

      if (!newUser) {
        return {
          ok: false,
          errors: {
            form: "Account created, but user information was not returned.",
          },
        };
      }

      setUser(newUser);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        errors: getApiErrors(error),
      };
    }
  }, []);

  // Login existing user.
  const login = useCallback(async (input) => {
    const errors = validateLogin(input);

    if (Object.keys(errors).length) {
      return { ok: false, errors };
    }

    try {
      const response = await userService.loginUser({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });

      const loggedInUser = extractUser(response);

      if (!loggedInUser) {
        return {
          ok: false,
          errors: {
            form: "Login succeeded, but user information was not returned.",
          },
        };
      }

      setUser(loggedInUser);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        errors: getApiErrors(error),
      };
    }
  }, []);

  // Logout current user.
  const logout = useCallback(async () => {
    try {
      await userService.logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      signup,
      login,
      logout,
    }),
    [user, loading, signup, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
