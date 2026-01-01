export interface AppSettings {
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  showAnimations: boolean;
  language: "fr" | "en" | "nl";
  currency: string;
  autoSave: boolean;
  notifications: {
    desktop: boolean;
    sound: boolean;
    email: boolean;
  };
}

// Default settings
const defaultSettings: AppSettings = {
  theme: "light",
  fontSize: "medium",
  compactMode: false,
  showAnimations: true,
  language: "fr",
  currency: "DH",
  autoSave: true,
  notifications: {
    desktop: true,
    sound: false,
    email: true,
  },
};

// Local storage key
const SETTINGS_KEY = "biohacking-clinic-settings";

// Load settings from localStorage or use defaults
let currentSettings: AppSettings = (() => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
  }
  return defaultSettings;
})();

export class AppSettingsService {
  // Get current settings
  static async getSettings(): Promise<AppSettings> {
    return { ...currentSettings };
  }

  // Update settings
  static async updateSettings(
    newSettings: Partial<AppSettings>,
  ): Promise<AppSettings> {
    currentSettings = { ...currentSettings, ...newSettings };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }

    // Apply settings to DOM
    this.applySettings(currentSettings);

    return { ...currentSettings };
  }

  // Apply settings to the DOM
  static applySettings(settings: AppSettings): void {
    const root = document.documentElement;

    // Apply theme
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      // System theme
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    // Apply font size
    root.classList.remove("text-sm", "text-base", "text-lg");
    switch (settings.fontSize) {
      case "small":
        root.classList.add("text-sm");
        break;
      case "large":
        root.classList.add("text-lg");
        break;
      default:
        root.classList.add("text-base");
    }

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add("compact-mode");
    } else {
      root.classList.remove("compact-mode");
    }

    // Apply animations
    if (!settings.showAnimations) {
      root.classList.add("no-animations");
    } else {
      root.classList.remove("no-animations");
    }

    // Store currency in CSS custom property for global access
    root.style.setProperty("--app-currency", settings.currency);

    // Dispatch currency change event for components to listen
    window.dispatchEvent(
      new CustomEvent("currencyChanged", {
        detail: { currency: settings.currency },
      }),
    );
  }

  // Initialize settings on app start
  static initializeSettings(): void {
    this.applySettings(currentSettings);

    // Listen for system theme changes
    if (currentSettings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        if (currentSettings.theme === "system") {
          this.applySettings(currentSettings);
        }
      });
    }
  }

  // Reset to defaults
  static async resetToDefaults(): Promise<AppSettings> {
    currentSettings = { ...defaultSettings };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }

    this.applySettings(currentSettings);

    return { ...currentSettings };
  }

  // Get theme options
  static getThemeOptions(): {
    value: AppSettings["theme"];
    label: string;
    description: string;
  }[] {
    return [
      {
        value: "light",
        label: "Clair",
        description: "Interface claire en permanence",
      },
      {
        value: "dark",
        label: "Sombre",
        description: "Interface sombre en permanence",
      },
      {
        value: "system",
        label: "Système",
        description: "Suit les préférences du système",
      },
    ];
  }

  // Get font size options
  static getFontSizeOptions(): {
    value: AppSettings["fontSize"];
    label: string;
    description: string;
  }[] {
    return [
      {
        value: "small",
        label: "Petite",
        description: "Texte plus compact",
      },
      {
        value: "medium",
        label: "Normale",
        description: "Taille par défaut",
      },
      {
        value: "large",
        label: "Grande",
        description: "Texte plus lisible",
      },
    ];
  }

  // Get language options
  static getLanguageOptions(): {
    value: AppSettings["language"];
    label: string;
  }[] {
    return [
      { value: "fr", label: "Français" },
      { value: "en", label: "English" },
      { value: "nl", label: "Nederlands" },
    ];
  }

  // Get currency options
  static getCurrencyOptions(): {
    value: string;
    label: string;
    symbol: string;
  }[] {
    return [
      { value: "DH", label: "Dirham marocain (DH)", symbol: "DH" },
      { value: "EUR", label: "Euro (€)", symbol: "€" },
      { value: "USD", label: "Dollar américain ($)", symbol: "$" },
      { value: "GBP", label: "Livre sterling (£)", symbol: "£" },
      { value: "CAD", label: "Dollar canadien (C$)", symbol: "C$" },
      { value: "CHF", label: "Franc suisse (CHF)", symbol: "CHF" },
    ];
  }

  // Get current currency symbol
  static getCurrentCurrencySymbol(): string {
    const currencyOptions = this.getCurrencyOptions();
    const currentCurrency = currencyOptions.find(
      (c) => c.value === currentSettings.currency,
    );
    return currentCurrency?.symbol || currentSettings.currency;
  }

  // Export settings
  static async exportSettings(): Promise<string> {
    return JSON.stringify(currentSettings, null, 2);
  }

  // Import settings
  static async importSettings(settingsJson: string): Promise<AppSettings> {
    try {
      const importedSettings = JSON.parse(settingsJson);

      // Validate imported settings
      const validatedSettings = { ...defaultSettings, ...importedSettings };

      currentSettings = validatedSettings;

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
      this.applySettings(currentSettings);

      return { ...currentSettings };
    } catch (error) {
      throw new Error("Format de fichier de paramètres invalide");
    }
  }
}

// Initialize settings when module loads
AppSettingsService.initializeSettings();
