import { ActionCard, Category, Product, Table } from '../types';

export const ACTION_CARDS: ActionCard[] = [
  { id: 'a1', label: 'Print', icon: 'printer-outline' },
  { id: 'a2', label: 'Kitchen', icon: 'silverware-fork-knife' },
  { id: 'a3', label: 'Void', icon: 'delete-outline' },
  { id: 'a4', label: 'Discount', icon: 'ticket-percent-outline' },
  { id: 'a5', label: 'Notes', icon: 'note-text-outline' },
  { id: 'a6', label: 'More', icon: 'dots-horizontal' },
];

export const CATEGORIES: Category[] = [
  { id: 'cat-burger', name: 'Burger' },
  { id: 'cat-side', name: 'Sides' },
  { id: 'cat-drink', name: 'Drinks' },
  { id: 'cat-sauce', name: 'Sauce' },
  { id: 'cat-dessert', name: 'Dessert' },
  { id: 'cat-extra', name: 'Extras' },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Burger Beef', price: 35000, categoryId: 'cat-burger', emoji: 'BB' },
  { id: 'p2', name: 'Burger Chicken', price: 32000, categoryId: 'cat-burger', emoji: 'BC' },
  {
    id: 'p3',
    name: 'Burger Chicken Double',
    price: 43000,
    categoryId: 'cat-burger',
    emoji: 'BD',
  },
  { id: 'p4', name: 'French Fries', price: 18000, categoryId: 'cat-side', emoji: 'FR' },
  { id: 'p5', name: 'Chicken Wings', price: 28000, categoryId: 'cat-side', emoji: 'CW' },
  { id: 'p6', name: 'Cola', price: 12000, categoryId: 'cat-drink', emoji: 'CO' },
  { id: 'p7', name: 'Lemon Tea', price: 14000, categoryId: 'cat-drink', emoji: 'LT' },
  { id: 'p8', name: 'Mineral Water', price: 8000, categoryId: 'cat-drink', emoji: 'MW' },
  { id: 'p9', name: 'Cheese Sauce', price: 6000, categoryId: 'cat-sauce', emoji: 'CS' },
  { id: 'p10', name: 'Spicy Sauce', price: 6000, categoryId: 'cat-sauce', emoji: 'SS' },
  { id: 'p11', name: 'Ice Cream', price: 15000, categoryId: 'cat-dessert', emoji: 'IC' },
  { id: 'p12', name: 'Extra Patty', price: 12000, categoryId: 'cat-extra', emoji: 'EP' },
];

export const TABLES: Table[] = [
  { id: 't1', number: '1', seats: 4, status: 'available' },
  { id: 't2', number: '2', seats: 2, status: 'occupied' },
  { id: 't3', number: '3', seats: 6, status: 'reserved' },
  { id: 't4', number: '4', seats: 4, status: 'available' },
  { id: 't5', number: '5', seats: 4, status: 'occupied' },
  { id: 't6', number: '6', seats: 8, status: 'available' },
];

export const formatPrice = (price: number): string => `Rp ${Math.round(price).toLocaleString('id-ID')}`;

let nextInvoiceSequence = 1;

const formatSequence = (value: number): string => String(value).padStart(4, '0');
const formatOrderSequence = (value: number): string => String(value);

export const generateReceiptNo = (): string => `RCPT-${formatSequence(nextInvoiceSequence)}`;

export const generateOrderNumber = (): string => `INV-${formatOrderSequence(nextInvoiceSequence)}`;

export const advanceOrderNumber = (): string => {
  nextInvoiceSequence += 1;
  return generateOrderNumber();
};
