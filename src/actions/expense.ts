"use server";

import { db } from "@/src/lib/db";
import { currentUser, currentRole } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";

// ========== Expense Reason Actions ==========

export interface ExpenseReasonData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export const createExpenseReason = async (data: ExpenseReasonData) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { error: "Reason name is required" };
    }

    const existingReason = await db.expenseReason.findUnique({
      where: { name: data.name.trim() },
    });

    if (existingReason) {
      return { error: "Reason with this name already exists" };
    }

    const reason = await db.expenseReason.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return { success: "Reason created successfully!", data: reason };
  } catch (error: any) {
    console.error("Error creating expense reason:", error);
    return { error: error.message || "Failed to create reason" };
  }
};

export const updateExpenseReason = async (
  id: string,
  data: Partial<ExpenseReasonData>
) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    if (data.name && data.name.trim().length === 0) {
      return { error: "Reason name cannot be empty" };
    }

    const existingReason = await db.expenseReason.findUnique({
      where: { id },
    });

    if (!existingReason) {
      return { error: "Reason not found" };
    }

    // Check if new name conflicts with existing reason
    if (data.name && data.name.trim() !== existingReason.name) {
      const nameConflict = await db.expenseReason.findUnique({
        where: { name: data.name.trim() },
      });
      if (nameConflict) {
        return { error: "Reason with this name already exists" };
      }
    }

    const updatedReason = await db.expenseReason.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return { success: "Reason updated successfully!", data: updatedReason };
  } catch (error: any) {
    console.error("Error updating expense reason:", error);
    return { error: error.message || "Failed to update reason" };
  }
};

export const deleteExpenseReason = async (id: string) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const reason = await db.expenseReason.findUnique({
      where: { id },
      include: { expenses: true },
    });

    if (!reason) {
      return { error: "Reason not found" };
    }

    if (reason.expenses.length > 0) {
      return {
        error: "Cannot delete reason that has associated expenses. Deactivate it instead.",
      };
    }

    await db.expenseReason.delete({
      where: { id },
    });

    return { success: "Reason deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting expense reason:", error);
    return { error: error.message || "Failed to delete reason" };
  }
};

export const getAllExpenseReasons = async (includeInactive = false) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const reasons = await db.expenseReason.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        subReasons: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: reasons };
  } catch (error: any) {
    console.error("Error fetching expense reasons:", error);
    return { error: error.message || "Failed to fetch reasons" };
  }
};

// ========== Expense SubReason Actions ==========

export interface ExpenseSubReasonData {
  reasonId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export const createExpenseSubReason = async (data: ExpenseSubReasonData) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { error: "SubReason name is required" };
    }

    if (!data.reasonId) {
      return { error: "Reason ID is required" };
    }

    // Check if reason exists
    const reason = await db.expenseReason.findUnique({
      where: { id: data.reasonId },
    });

    if (!reason) {
      return { error: "Reason not found" };
    }

    // Check if subreason already exists for this reason
    const existingSubReason = await db.expenseSubReason.findUnique({
      where: {
        reasonId_name: {
          reasonId: data.reasonId,
          name: data.name.trim(),
        },
      },
    });

    if (existingSubReason) {
      return {
        error: "SubReason with this name already exists for this reason",
      };
    }

    const subReason = await db.expenseSubReason.create({
      data: {
        reasonId: data.reasonId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        reason: {
          select: { id: true, name: true },
        },
      },
    });

    return { success: "SubReason created successfully!", data: subReason };
  } catch (error: any) {
    console.error("Error creating expense subreason:", error);
    return { error: error.message || "Failed to create subreason" };
  }
};

export const updateExpenseSubReason = async (
  id: string,
  data: Partial<ExpenseSubReasonData>
) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    if (data.name && data.name.trim().length === 0) {
      return { error: "SubReason name cannot be empty" };
    }

    const existingSubReason = await db.expenseSubReason.findUnique({
      where: { id },
    });

    if (!existingSubReason) {
      return { error: "SubReason not found" };
    }

    const reasonId = data.reasonId || existingSubReason.reasonId;
    const name = data.name?.trim() || existingSubReason.name;

    // Check if new name conflicts with existing subreason for the same reason
    if (data.name && name !== existingSubReason.name) {
      const nameConflict = await db.expenseSubReason.findUnique({
        where: {
          reasonId_name: {
            reasonId: reasonId,
            name: name,
          },
        },
      });
      if (nameConflict) {
        return {
          error: "SubReason with this name already exists for this reason",
        };
      }
    }

    const updatedSubReason = await db.expenseSubReason.update({
      where: { id },
      data: {
        ...(data.reasonId && { reasonId: data.reasonId }),
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        reason: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      success: "SubReason updated successfully!",
      data: updatedSubReason,
    };
  } catch (error: any) {
    console.error("Error updating expense subreason:", error);
    return { error: error.message || "Failed to update subreason" };
  }
};

export const deleteExpenseSubReason = async (id: string) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const subReason = await db.expenseSubReason.findUnique({
      where: { id },
      include: { expenses: true },
    });

    if (!subReason) {
      return { error: "SubReason not found" };
    }

    if (subReason.expenses.length > 0) {
      return {
        error:
          "Cannot delete subreason that has associated expenses. Deactivate it instead.",
      };
    }

    await db.expenseSubReason.delete({
      where: { id },
    });

    return { success: "SubReason deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting expense subreason:", error);
    return { error: error.message || "Failed to delete subreason" };
  }
};

export const getSubReasonsByReasonId = async (reasonId: string) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const subReasons = await db.expenseSubReason.findMany({
      where: {
        reasonId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: subReasons };
  } catch (error: any) {
    console.error("Error fetching subreasons:", error);
    return { error: error.message || "Failed to fetch subreasons" };
  }
};

// ========== Expense Actions ==========

export interface ExpenseData {
  reasonId: string;
  subReasonId?: string;
  amount: number;
  description?: string;
  date?: Date;
}

export const createExpense = async (data: ExpenseData) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    if (!user.id) {
      return { error: "User ID is required" };
    }

    if (!data.reasonId) {
      return { error: "Reason is required" };
    }

    if (!data.amount || data.amount <= 0) {
      return { error: "Amount must be greater than 0" };
    }

    // Verify reason exists
    const reason = await db.expenseReason.findUnique({
      where: { id: data.reasonId },
    });

    if (!reason) {
      return { error: "Reason not found" };
    }

    // Verify subreason exists if provided
    if (data.subReasonId) {
      const subReason = await db.expenseSubReason.findUnique({
        where: { id: data.subReasonId },
      });

      if (!subReason) {
        return { error: "SubReason not found" };
      }

      if (subReason.reasonId !== data.reasonId) {
        return { error: "SubReason does not belong to the selected reason" };
      }
    }

    const expense = await db.expense.create({
      data: {
        reasonId: data.reasonId,
        subReasonId: data.subReasonId || null,
        amount: data.amount,
        description: data.description?.trim() || null,
        date: data.date || new Date(),
        createdById: user.id,
      },
      include: {
        reason: {
          select: { id: true, name: true },
        },
        subReason: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return { success: "Expense created successfully!", data: expense };
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return { error: error.message || "Failed to create expense" };
  }
};

export const updateExpense = async (id: string, data: Partial<ExpenseData>) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const existingExpense = await db.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return { error: "Expense not found" };
    }

    if (data.amount !== undefined && data.amount <= 0) {
      return { error: "Amount must be greater than 0" };
    }

    // Verify reason if changed
    if (data.reasonId) {
      const reason = await db.expenseReason.findUnique({
        where: { id: data.reasonId },
      });

      if (!reason) {
        return { error: "Reason not found" };
      }
    }

    // Verify subreason if changed
    if (data.subReasonId !== undefined) {
      if (data.subReasonId) {
        const subReason = await db.expenseSubReason.findUnique({
          where: { id: data.subReasonId },
        });

        if (!subReason) {
          return { error: "SubReason not found" };
        }

        const reasonId = data.reasonId || existingExpense.reasonId;
        if (subReason.reasonId !== reasonId) {
          return {
            error: "SubReason does not belong to the selected reason",
          };
        }
      }
    }

    const updatedExpense = await db.expense.update({
      where: { id },
      data: {
        ...(data.reasonId && { reasonId: data.reasonId }),
        ...(data.subReasonId !== undefined && {
          subReasonId: data.subReasonId || null,
        }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.date && { date: data.date }),
      },
      include: {
        reason: {
          select: { id: true, name: true },
        },
        subReason: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return { success: "Expense updated successfully!", data: updatedExpense };
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { error: error.message || "Failed to update expense" };
  }
};

export const deleteExpense = async (id: string) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const expense = await db.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return { error: "Expense not found" };
    }

    await db.expense.delete({
      where: { id },
    });

    return { success: "Expense deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { error: error.message || "Failed to delete expense" };
  }
};

export const getAllExpenses = async (
  page: number = 1,
  pageSize: number = 20,
  reasonId?: string,
  startDate?: Date,
  endDate?: Date
) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (reasonId) {
      where.reasonId = reasonId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        include: {
          reason: {
            select: { id: true, name: true },
          },
          subReason: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take: pageSize,
      }),
      db.expense.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: expenses,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        pageSize,
      },
    };
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return { error: error.message || "Failed to fetch expenses" };
  }
};

export const getExpenseStats = async (
  startDate?: Date,
  endDate?: Date
) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const [totalExpenses, totalAmount, expensesByReason] = await Promise.all([
      db.expense.count({ where }),
      db.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      db.expense.groupBy({
        by: ["reasonId"],
        where,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Get reason names for the grouped data
    const reasonIds = expensesByReason.map((e) => e.reasonId);
    const reasons = await db.expenseReason.findMany({
      where: { id: { in: reasonIds } },
      select: { id: true, name: true },
    });

    const expensesByReasonWithNames = expensesByReason.map((expense) => {
      const reason = reasons.find((r) => r.id === expense.reasonId);
      return {
        reasonId: expense.reasonId,
        reasonName: reason?.name || "Unknown",
        totalAmount: expense._sum.amount || 0,
        count: expense._count.id,
      };
    });

    return {
      success: true,
      data: {
        totalExpenses,
        totalAmount: totalAmount._sum.amount || 0,
        expensesByReason: expensesByReasonWithNames,
      },
    };
  } catch (error: any) {
    console.error("Error fetching expense stats:", error);
    return { error: error.message || "Failed to fetch expense stats" };
  }
};
