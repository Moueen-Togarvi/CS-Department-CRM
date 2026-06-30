import { z } from "zod";

export const ROOM_TYPES = ["CLASSROOM", "LAB", "SEMINAR_HALL", "OFFICE"] as const;
export const roomTypeSchema = z.enum(ROOM_TYPES);

export const createRoomSchema = z
  .object({
    name: z.string().min(1, "Room name is required").max(100),
    building: z.string().min(1, "Building name is required").max(100),
    floor: z.coerce.number().int().optional().nullable(),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").default(30),
    roomType: roomTypeSchema.default("CLASSROOM"),
    hasProjector: z.boolean().default(false),
    hasAC: z.boolean().default(false),
    isAvailable: z.boolean().default(true),
  })
  .strict();

export const updateRoomSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    building: z.string().min(1).max(100).optional(),
    floor: z.coerce.number().int().optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional(),
    roomType: roomTypeSchema.optional(),
    hasProjector: z.boolean().optional(),
    hasAC: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  })
  .strict();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
