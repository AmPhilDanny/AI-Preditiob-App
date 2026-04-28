import { NextResponse } from 'next/server';
import { configService } from '@/lib/services/config';

export async function GET() {
  const config = await configService.getConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const newConfig = await request.json();
    const updated = await configService.updateConfig(newConfig);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 400 });
  }
}
