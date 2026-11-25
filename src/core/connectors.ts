import type { InboxProvider } from './types';

export type ConnectorCategory =
  | 'email'
  | 'storage'
  | 'ledgers'
  | 'tax'
  | 'practice'
  | 'banking';

export interface ConnectorDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly inboxTarget?: InboxProvider;
}

export const CONNECTOR_GROUPS: ReadonlyArray<{
  readonly id: ConnectorCategory;
  readonly label: string;
}> = [
  { id: 'email', label: 'Email' },
  { id: 'storage', label: 'Storage & Docs' },
  { id: 'ledgers', label: 'Ledgers' },
  { id: 'tax', label: 'Tax & HMRC' },
  { id: 'practice', label: 'Practice' },
  { id: 'banking', label: 'Banking & Payroll' },
];

export const CONNECTOR_CATALOG: ReadonlyArray<ConnectorDefinition> = [
  { id: 'gmail', name: 'Google Workspace (Gmail)', category: 'email', inboxTarget: 'gmail' },
  { id: 'outlook', name: 'Microsoft 365 Outlook', category: 'email', inboxTarget: 'outlook' },
  { id: 'sharepoint', name: 'Microsoft SharePoint', category: 'storage' },
  { id: 'onedrive', name: 'Microsoft OneDrive', category: 'storage' },
  { id: 'gdrive', name: 'Google Drive', category: 'storage' },
  { id: 'xero', name: 'Xero', category: 'ledgers' },
  { id: 'quickbooks', name: 'QuickBooks Online', category: 'ledgers' },
  { id: 'sage', name: 'Sage Intacct & 50', category: 'ledgers' },
  { id: 'netsuite', name: 'Oracle NetSuite', category: 'ledgers' },
  { id: 'freeagent', name: 'FreeAgent', category: 'ledgers' },
  { id: 'hmrc-mtd', name: 'HMRC Making Tax Digital', category: 'tax' },
  { id: 'companies-house', name: 'Companies House', category: 'tax' },
  { id: 'cch-axcess', name: 'Wolters Kluwer CCH Axcess', category: 'tax' },
  { id: 'ultratax', name: 'Thomson Reuters UltraTax CS', category: 'tax' },
  { id: 'iris-tax', name: 'IRIS Elements', category: 'tax' },
  { id: 'karbon', name: 'Karbon', category: 'practice' },
  { id: 'caseware', name: 'Caseware Cloud', category: 'practice' },
  { id: 'dext', name: 'Dext Prepare', category: 'practice' },
  { id: 'ignition', name: 'Ignition', category: 'practice' },
  { id: 'open-banking', name: 'Open Banking UK / Plaid', category: 'banking' },
  { id: 'stripe', name: 'Stripe', category: 'banking' },
  { id: 'gusto', name: 'Gusto', category: 'banking' },
];
