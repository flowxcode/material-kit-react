import { NextResponse } from 'next/server';

import logger from 'src/utils/logger';

import { query } from './db';

export async function apiHandler<T>(
  fn: () => Promise<T>,
  options: { useTransaction?: boolean } = {}
): Promise<NextResponse> {
  if (options.useTransaction) {
    try {
      await query('BEGIN');
      await query("SET SESSION idle_in_transaction_session_timeout = 0");
      const data = await fn();
      await query('COMMIT');
      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('API error', error);
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  } else {
    try {
      const data = await fn();
      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      logger.error('API error', error);
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}