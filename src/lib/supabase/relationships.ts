export type DbRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export const DB_RELATIONSHIPS = {
  leads: [
    {
      foreignKeyName: 'leads_assigned_cro_id_fkey',
      columns: ['assigned_cro_id'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
    {
      foreignKeyName: 'leads_created_by_fkey',
      columns: ['created_by'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
    {
      foreignKeyName: 'leads_updated_by_fkey',
      columns: ['updated_by'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
  ],
  follow_ups: [
    {
      foreignKeyName: 'follow_ups_lead_id_fkey',
      columns: ['lead_id'],
      isOneToOne: false,
      referencedRelation: 'leads',
      referencedColumns: ['id'],
    },
    {
      foreignKeyName: 'follow_ups_pic_id_fkey',
      columns: ['pic_id'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
  ],
  lead_activities: [
    {
      foreignKeyName: 'lead_activities_lead_id_fkey',
      columns: ['lead_id'],
      isOneToOne: false,
      referencedRelation: 'leads',
      referencedColumns: ['id'],
    },
    {
      foreignKeyName: 'lead_activities_created_by_fkey',
      columns: ['created_by'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
  ],
  lead_interventions: [
    {
      foreignKeyName: 'lead_interventions_lead_id_fkey',
      columns: ['lead_id'],
      isOneToOne: false,
      referencedRelation: 'leads',
      referencedColumns: ['id'],
    },
    {
      foreignKeyName: 'lead_interventions_created_by_fkey',
      columns: ['created_by'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
  ],
  payments: [
    {
      foreignKeyName: 'payments_lead_id_fkey',
      columns: ['lead_id'],
      isOneToOne: false,
      referencedRelation: 'leads',
      referencedColumns: ['id'],
    },
    {
      foreignKeyName: 'payments_verified_by_fkey',
      columns: ['verified_by'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
  ],
  pemetaan: [
    {
      foreignKeyName: 'pemetaan_lead_id_fkey',
      columns: ['lead_id'],
      isOneToOne: false,
      referencedRelation: 'leads',
      referencedColumns: ['id'],
    },
  ],
  expert_consultations: [
    {
      foreignKeyName: 'expert_consultations_lead_id_fkey',
      columns: ['lead_id'],
      isOneToOne: false,
      referencedRelation: 'leads',
      referencedColumns: ['id'],
    },
  ],
  playbook_items: [
    {
      foreignKeyName: 'playbook_items_created_by_fkey',
      columns: ['created_by'],
      isOneToOne: false,
      referencedRelation: 'users',
      referencedColumns: ['id'],
    },
  ],
} as const satisfies Record<string, readonly DbRelationship[]>
