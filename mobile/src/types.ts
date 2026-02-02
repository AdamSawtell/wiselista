export type JobStatus = "draft" | "submitted" | "payment_pending" | "processing" | "ready" | "failed";

export type RoomType = "living_room" | "kitchen" | "bedroom" | "bathroom" | "exterior" | "other";

export interface Job {
  id: string;
  user_id?: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  job_id: string;
  room_type: RoomType;
  sequence: number;
  original_key: string;
  edited_key: string | null;
  created_at: string;
}

export const ROOM_LABELS: Record<RoomType, string> = {
  living_room: "Living room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  exterior: "Exterior",
  other: "Other",
};

export const ROOM_TYPES: RoomType[] = [
  "living_room",
  "kitchen",
  "bedroom",
  "bathroom",
  "exterior",
  "other",
];
