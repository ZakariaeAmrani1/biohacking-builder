import { AppSettingsService } from "./appSettingsService";

export class CurrencyService {
  // Format currency amount
  static formatCurrency(amount: number, showSymbol: boolean = true): string {
    const currency = AppSettingsService.getCurrentCurrencySymbol();

    // Format the number with proper decimals
    const formattedAmount = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (!showSymbol) {
      return formattedAmount;
    }

    // Different currency formatting styles
    switch (currency) {
      case "DH":
        return `${formattedAmount} DH`;
      case "€":
        return `${formattedAmount} €`;
      case "$":
        return `$${formattedAmount}`;
      case "£":
        return `£${formattedAmount}`;
      case "C$":
        return `C$${formattedAmount}`;
      case "CHF":
        return `${formattedAmount} CHF`;
      default:
        return `${formattedAmount} ${currency}`;
    }
  }

  // Format currency without decimals for whole numbers
  static formatCurrencyWhole(
    amount: number,
    showSymbol: boolean = true,
  ): string {
    const currency = AppSettingsService.getCurrentCurrencySymbol();

    // Check if it's a whole number
    const isWhole = amount % 1 === 0;

    const formattedAmount = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (!showSymbol) {
      return formattedAmount;
    }

    switch (currency) {
      case "DH":
        return `${formattedAmount} DH`;
      case "€":
        return `${formattedAmount} €`;
      case "$":
        return `$${formattedAmount}`;
      case "£":
        return `£${formattedAmount}`;
      case "C$":
        return `C$${formattedAmount}`;
      case "CHF":
        return `${formattedAmount} CHF`;
      default:
        return `${formattedAmount} ${currency}`;
    }
  }

  // Get current currency symbol only
  static getCurrentSymbol(): string {
    return AppSettingsService.getCurrentCurrencySymbol();
  }

  // Parse currency string to number
  static parseCurrency(currencyString: string): number {
    // Remove all non-numeric characters except decimal separator
    const cleanString = currencyString.replace(/[^\d,-]/g, "");
    // Replace comma with dot for proper parsing
    const normalizedString = cleanString.replace(",", ".");
    return parseFloat(normalizedString) || 0;
  }

  // Format price range
  static formatPriceRange(minPrice: number, maxPrice: number): string {
    if (minPrice === maxPrice) {
      return this.formatCurrency(minPrice);
    }
    return `${this.formatCurrency(minPrice)} - ${this.formatCurrency(maxPrice)}`;
  }

  // Format currency input placeholder
  static getCurrencyPlaceholder(): string {
    const symbol = this.getCurrentSymbol();
    switch (symbol) {
      case "DH":
        return "0,00 DH";
      case "€":
        return "0,00 €";
      case "$":
        return "$0.00";
      case "��":
        return "£0.00";
      case "C$":
        return "C$0.00";
      case "CHF":
        return "0,00 CHF";
      default:
        return `0,00 ${symbol}`;
    }
  }

  // Format for display in tables and lists
  static formatForDisplay(amount: number, compact: boolean = false): string {
    if (compact && amount >= 1000) {
      const thousands = amount / 1000;
      const currency = this.getCurrentSymbol();

      switch (currency) {
        case "DH":
          return `${thousands.toFixed(1)}k DH`;
        case "€":
          return `${thousands.toFixed(1)}k €`;
        case "$":
          return `$${thousands.toFixed(1)}k`;
        case "£":
          return `£${thousands.toFixed(1)}k`;
        case "C$":
          return `C$${thousands.toFixed(1)}k`;
        case "CHF":
          return `${thousands.toFixed(1)}k CHF`;
        default:
          return `${thousands.toFixed(1)}k ${currency}`;
      }
    }

    return this.formatCurrency(amount);
  }

  // Currency validation
  static isValidCurrencyInput(input: string): boolean {
    // Allow numbers, commas, dots, and common currency symbols
    const currencyRegex = /^[\d\s.,€$£]*(DH|CHF|C\$)?[\d\s.,€$£]*$/i;
    return currencyRegex.test(input.trim());
  }

  // Convert currency input to standardized number
  static standardizeCurrencyInput(input: string): number {
    // Remove currency symbols and extra spaces
    let cleanInput = input
      .replace(/[€$£]/g, "")
      .replace(/DH|CHF|C\$/gi, "")
      .trim();

    // Handle European format (comma as decimal separator)
    if (cleanInput.includes(",") && !cleanInput.includes(".")) {
      cleanInput = cleanInput.replace(",", ".");
    } else if (cleanInput.includes(",") && cleanInput.includes(".")) {
      // If both exist, assume comma is thousands separator
      cleanInput = cleanInput.replace(/,/g, "");
    }

    return parseFloat(cleanInput) || 0;
  }
}
