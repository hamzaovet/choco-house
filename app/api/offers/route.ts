export { GET, PUT } from "@/app/api/public/offers/route";
export async function POST(req: Request) {
  const { PUT } = await import("@/app/api/public/offers/route");
  return PUT(req);
}
