import { CancelLog, CancelReason } from '../types';

type CancelLogInput = {
  orderNumber: string;
  reason: CancelReason;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
};

type CreateCancelLogOptions = {
  id?: string;
  now?: Date;
};

const buildCancelLogId = () => `cancel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const createCancelLog = (
  payload: CancelLogInput,
  options: CreateCancelLogOptions = {}
): CancelLog => {
  const now = options.now ?? new Date();

  return {
    id: options.id ?? buildCancelLogId(),
    orderNumber: payload.orderNumber,
    reason: payload.reason,
    subtotal: payload.subtotal,
    discount: payload.discount,
    tax: payload.tax,
    total: payload.total,
    itemCount: payload.itemCount,
    createdAt: now.toISOString(),
  };
};
