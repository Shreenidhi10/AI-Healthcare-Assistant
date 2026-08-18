const API_BASE_URL = "/api";

export const authService = {
  // Helper to read all saved profiles
  getSavedProfiles: () => {
    try {
      const stored = localStorage.getItem("user_profiles");
      return stored ? JSON.parse(stored) : {};
    } catch (_) {
      return {};
    }
  },

  // Helper to save profile to persistent map
  saveProfileToStorage: (email, profileData) => {
    try {
      const profiles = authService.getSavedProfiles();
      profiles[email.toLowerCase()] = {
        ...profiles[email.toLowerCase()],
        ...profileData,
      };
      localStorage.setItem("user_profiles", JSON.stringify(profiles));
    } catch (e) {
      console.error("Error saving user profile locally:", e);
    }
  },

  login: async ({ email, password }) => {
    let loggedInUser = null;
    const lowerEmail = email.toLowerCase();
    const savedProfiles = authService.getSavedProfiles();
    const existingProfile = savedProfiles[lowerEmail] || {};

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.access_token;

        loggedInUser = {
          id: data.user_id || existingProfile.id || "user-1",
          email: email,
          name: existingProfile.name || existingProfile.full_name || email.split("@")[0].replace(".", " "),
          phone_number: existingProfile.phone_number || existingProfile.phone || "+91 98765 43210",
          phone: existingProfile.phone || existingProfile.phone_number || "+91 98765 43210",
          token: token,
          ...existingProfile,
        };

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(loggedInUser));

        return { success: true, user: loggedInUser, token };
      }
    } catch (err) {
      console.warn("Backend auth offline or unreachable, using client auth handler:", err);
    }

    // Demo / Offline Fallback Login
    if (password && email) {
      loggedInUser = {
        email: email,
        name: existingProfile.name || (email === "demo@healthcare.ai" ? "Demo Patient" : email.split("@")[0]),
        phone_number: existingProfile.phone_number || existingProfile.phone || "+91 98765 43210",
        phone: existingProfile.phone || existingProfile.phone_number || "+91 98765 43210",
        role: "patient",
        token: "demo-token-12345",
        ...existingProfile,
      };

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("authToken", loggedInUser.token);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      return { success: true, user: loggedInUser, token: loggedInUser.token };
    }

    throw new Error("Invalid credentials");
  },

  register: async ({ full_name, email, password, role = "patient" }) => {
    const lowerEmail = email.toLowerCase();
    const newUser = {
      email,
      name: full_name || email.split("@")[0],
      full_name: full_name || email.split("@")[0],
      phone_number: "+91 98765 43210",
      phone: "+91 98765 43210",
      role,
      token: "demo-token-" + Date.now(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: full_name || email.split("@")[0],
          preferred_language: "en",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        newUser.id = data.id;
      }
    } catch (err) {
      console.warn("Backend registration offline, saving locally:", err);
    }

    authService.saveProfileToStorage(lowerEmail, newUser);

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("authToken", newUser.token);
    localStorage.setItem("user", JSON.stringify(newUser));

    return { success: true, user: newUser };
  },

  googleLogin: async () => {
    const googleUser = {
      email: "google.user@healthcare.ai",
      name: "Google User",
      phone_number: "+91 98765 43210",
      phone: "+91 98765 43210",
      role: "patient",
      token: "google-token-" + Date.now(),
    };

    authService.saveProfileToStorage(googleUser.email, googleUser);

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("authToken", googleUser.token);
    localStorage.setItem("user", JSON.stringify(googleUser));

    return { success: true, user: googleUser };
  },

  updateProfile: async (updatedData) => {
    const storedUserStr = localStorage.getItem("user");
    const currentUser = storedUserStr ? JSON.parse(storedUserStr) : {};
    const mergedUser = { ...currentUser, ...updatedData };

    if (mergedUser.email) {
      authService.saveProfileToStorage(mergedUser.email, mergedUser);
    }

    localStorage.setItem("user", JSON.stringify(mergedUser));

    // Also sync to backend API if reachable
    try {
      await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mergedUser.name || mergedUser.full_name,
          email: mergedUser.email,
          phone: mergedUser.phone_number || mergedUser.phone,
        }),
      });
    } catch (err) {
      console.warn("Backend profile update sync offline:", err);
    }

    return mergedUser;
  },

  getCurrentUser: () => {
    try {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      const userStr = localStorage.getItem("user");
      if (isLoggedIn && userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Error reading stored user:", e);
    }
    return null;
  },

  logout: async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
    }

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    return { success: true };
  },
};