import { z } from 'zod';

export const registrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const courseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
});

export type CourseInput = z.infer<typeof courseSchema>;

export const chapterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  video_url: z.string().url('Invalid video URL format'),
  order_index: z.number().int().min(0, 'Order must be non-negative'),
});

export type ChapterInput = z.infer<typeof chapterSchema>;

export const chapterUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  video_url: z.string().url('Invalid video URL format').optional(),
});

export type ChapterUpdateInput = z.infer<typeof chapterUpdateSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function validateEmail(email: string): boolean {
  return registrationSchema.shape.email.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validateCourseInput(data: unknown): CourseInput {
  return courseSchema.parse(data);
}

export function validateChapterInput(data: unknown): ChapterInput {
  return chapterSchema.parse(data);
}

export function validateRegistrationInput(data: unknown): RegistrationInput {
  return registrationSchema.parse(data);
}