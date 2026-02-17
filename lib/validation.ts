import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const UserRoleEnum = z.enum(["ADMIN", "KASIR"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const OrderStatusEnum = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const PaymentMethodEnum = z.enum(["CASH", "CARD", "QRIS", "TRANSFER"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// ============================================================================
// Common Schemas
// ============================================================================

export const idSchema = z.string().cuid("Invalid ID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const dateQuerySchema = z.object({
  date: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// User Schemas
// ============================================================================

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: UserRoleEnum,
});

export const updateUserSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: UserRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const userIdParamSchema = z.object({
  id: idSchema,
});

// ============================================================================
// Category Schemas
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.coerce.number().int().nonnegative().optional(),
});

export const updateCategorySchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required").max(50, "Name is too long").optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.coerce.number().int().nonnegative().optional(),
});

export const deleteCategorySchema = z.object({
  id: idSchema,
});

// ============================================================================
// Menu Schemas
// ============================================================================

export const createMenuSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  price: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Price must be a number" })
    .positive("Price must be positive"),
  image: z.string().url("Invalid image URL").optional(),
  categoryId: idSchema,
  isAvailable: z.boolean().optional(),
});

export const updateMenuSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  description: z.string().max(500, "Description is too long").optional(),
  price: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Price must be a number" })
    .positive("Price must be positive")
    .optional(),
  image: z.string().url("Invalid image URL").optional(),
  categoryId: idSchema.optional(),
  isAvailable: z.boolean().optional(),
});

export const deleteMenuSchema = z.object({
  id: idSchema,
});

// ============================================================================
// Order Item Schemas
// ============================================================================

export const orderItemSchema = z.object({
  menuId: idSchema,
  quantity: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Quantity must be a number" })
    .int("Quantity must be an integer")
    .positive("Quantity must be positive"),
  price: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Price must be a number" })
    .nonnegative("Price cannot be negative"),
  notes: z.string().max(200, "Notes are too long").optional(),
});

// ============================================================================
// Order Schemas
// ============================================================================

export const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item is required")
    .refine((items) => items.length > 0, "Items array cannot be empty"),
  subtotal: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Subtotal must be a number" })
    .nonnegative("Subtotal cannot be negative"),
  tax: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Tax must be a number" })
    .nonnegative("Tax cannot be negative")
    .optional()
    .default(0),
  discount: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Discount must be a number" })
    .nonnegative("Discount cannot be negative")
    .optional()
    .default(0),
  total: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Total must be a number" })
    .nonnegative("Total cannot be negative"),
  paymentMethod: PaymentMethodEnum.optional().default("CASH"),
  notes: z.string().max(500, "Notes are too long").optional(),
});

export const updateOrderSchema = z.object({
  id: idSchema,
  status: OrderStatusEnum.optional(),
  notes: z.string().max(500, "Notes are too long").optional(),
});

export const patchOrderSchema = z.object({
  status: OrderStatusEnum.optional(),
  notes: z.string().max(500, "Notes are too long").optional(),
});

export const orderQuerySchema = z.object({
  status: OrderStatusEnum.optional(),
  userId: idSchema.optional(),
  ...dateQuerySchema.shape,
});

export const orderIdParamSchema = z.object({
  id: idSchema,
});

// ============================================================================
// Settings Schemas
// ============================================================================

export const updateSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(100, "Store name is too long"),
  address: z.string().max(200, "Address is too long").optional(),
  phone: z.string().max(20, "Phone number is too long").optional(),
  taxRate: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Tax rate must be a number" })
    .nonnegative("Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
});

// ============================================================================
// Receipt Template Schemas
// ============================================================================

export const updateReceiptTemplateSchema = z.object({
  header: z.string().max(500, "Header is too long").optional(),
  footer: z.string().max(500, "Footer is too long").optional(),
  showDate: z.boolean().optional(),
  showTime: z.boolean().optional(),
  showCashier: z.boolean().optional(),
  showTax: z.boolean().optional(),
  paperWidth: z.coerce
    .number()
    .refine((val) => !isNaN(val), { message: "Paper width must be a number" })
    .int("Paper width must be an integer")
    .positive("Paper width must be positive")
    .max(100, "Paper width cannot exceed 100mm")
    .optional(),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime("Invalid start date format").optional(),
  endDate: z.string().datetime("Invalid end date format").optional(),
  period: z.enum(["today", "week", "month", "year", "custom"]).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type PatchOrderInput = z.infer<typeof patchOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateReceiptTemplateInput = z.infer<typeof updateReceiptTemplateSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
