
import { FinancialSummary } from "../types";

export const getFinancialSummary = async (): Promise<FinancialSummary> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        isConnected: true, // Always true as it's internal
        currentBalance: 5123.45,
        monthlyIncome: 3500.00,
        monthlyExpense: 2100.00,
        safeToSpend: 750.00,
        recentTransactions: [
          { id: 'tx101', date: '2024-03-15', merchant: 'Local Crafts Market', amount: 75.00, category: 'Shopping', type: 'expense' },
          { id: 'tx102', date: '2024-03-14', merchant: 'Salary Deposit', amount: 1750.00, category: 'Income', type: 'income' },
          { id: 'tx103', date: '2024-03-12', merchant: 'Belize Food Tours', amount: 120.00, category: 'Food & Dining', type: 'expense' },
          { id: 'tx104', date: '2024-03-11', merchant: 'Utility Bill', amount: 90.00, category: 'Utilities', type: 'expense' },
          { id: 'tx105', date: '2024-03-10', merchant: 'Artisan Workshop', amount: 300.00, category: 'Education', type: 'expense' },
        ]
      });
    }, 800);
  });
};

// New internal affordability check - always returns true for now
export const checkAffordability = async (price: number): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple logic: can afford if current balance is greater than price * 1.2 (for buffer)
      // In a real app, this would involve more sophisticated internal checks
      const mockCurrentBalance = 5123.45; 
      resolve(mockCurrentBalance > (price * 1.2)); 
    }, 300);
  });
};