import { NextRequest } from 'next/server';
import { autonomousGrowthManager } from '@/lib/autonomous-growth-manager';
import { AutonomousGrowthLoop } from '@/types/autonomous-growth';

export async function POST(request: NextRequest) {
  try {
    const { goal, userId } = await request.json();

    if (!goal || !userId) {
      return new Response(
        JSON.stringify({ error: 'Goal and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 새로운 자동 성장 루프 생성
    const newLoop = await autonomousGrowthManager.createLoop(goal, userId);

    return new Response(
      JSON.stringify(newLoop),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating autonomous growth loop:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loopId = searchParams.get('loopId');
    const userId = searchParams.get('userId');

    if (loopId) {
      // 특정 루프 정보 가져오기
      const loop = autonomousGrowthManager.getLoop(loopId);
      if (!loop) {
        return new Response(
          JSON.stringify({ error: 'Loop not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify(loop),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (userId) {
      // 사용자의 모든 루프 가져오기
      const loops = autonomousGrowthManager.getLoops().filter(loop => loop.userId === userId);
      return new Response(
        JSON.stringify(loops),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // 모든 루프 가져오기 (관리자용)
      const loops = autonomousGrowthManager.getLoops();
      return new Response(
        JSON.stringify(loops),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error fetching autonomous growth loops:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { loopId, action } = await request.json();

    if (!loopId || !action) {
      return new Response(
        JSON.stringify({ error: 'LoopId and action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let result = false;
    switch (action) {
      case 'start':
        result = await autonomousGrowthManager.startLoop(loopId);
        break;
      case 'pause':
        result = await autonomousGrowthManager.pauseLoop(loopId);
        break;
      case 'stop':
        result = await autonomousGrowthManager.stopLoop(loopId);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use start, pause, or stop.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: `Failed to ${action} loop` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Loop ${action}ed successfully` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error managing autonomous growth loop:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}