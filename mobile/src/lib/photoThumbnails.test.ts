import { fetchJobThumbnailUrls } from "./photoThumbnails";
import { supabase } from "./supabase";

jest.mock("./supabase", () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

const mockFrom = supabase.from as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;

describe("fetchJobThumbnailUrls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns signed URL for first photo per job", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { job_id: "j1", original_key: "orig1.jpg", edited_key: null, sequence: 0 },
              { job_id: "j2", original_key: "orig2.jpg", edited_key: "edit2.jpg", sequence: 0 },
            ],
          }),
        }),
      }),
    });

    const createSignedUrl = jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve({ data: { signedUrl: `https://cdn/${key}` } })
      );
    mockStorageFrom.mockReturnValue({ createSignedUrl });

    const urls = await fetchJobThumbnailUrls([
      { id: "j1", status: "draft" },
      { id: "j2", status: "ready" },
    ]);

    expect(urls.j1).toBe("https://cdn/orig1.jpg");
    expect(urls.j2).toBe("https://cdn/edit2.jpg");
  });

  it("returns empty object when no jobs", async () => {
    const urls = await fetchJobThumbnailUrls([]);
    expect(urls).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
