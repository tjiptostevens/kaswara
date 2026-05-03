/**
 * Amendment Service
 * Centralized logic for creating amended records across different entity types
 * Eliminates duplication of: mark-as-amended + create-new-draft + copy-children pattern
 */

import { supabase } from './supabase'

/**
 * Generic function to create an amended record
 * Pattern: Mark original as amended → Create new draft → Copy child records
 *
 * @param {string} tableName - Database table name (e.g., 'transaksi', 'rab', 'rap')
 * @param {string} recordId - ID of original record to amend
 * @param {Object} newData - Fields for the new amended record
 * @param {string} userId - User ID making the amendment
 * @param {Object} options
 * @param {string} [options.childTableName] - Child table to copy records from (e.g., 'rab_item')
 * @param {string} [options.childForeignKey] - Foreign key in child table (e.g., 'rab_id')
 * @param {Array<string>} [options.childIgnoreFields] - Fields to skip when copying children
 * @returns {Promise<{data: Object, error: Error | null}>}
 */
export async function createAmendmentRecord(
    tableName,
    recordId,
    newData,
    userId,
    options = {}
) {
    const now = new Date().toISOString()
    const { childTableName, childForeignKey, childIgnoreFields = ['id', childForeignKey] } = options

    try {
        // 1. Fetch original record
        const { data: original, error: fetchErr } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', recordId)
            .single()

        if (fetchErr) throw fetchErr
        if (!original) throw new Error(`Record ${recordId} not found in ${tableName}`)

        // 2. Mark original as amended
        const { error: markErr } = await supabase
            .from(tableName)
            .update({
                status: 'amended',
                amended_by: userId,
                amended_at: now,
            })
            .eq('id', recordId)

        if (markErr) throw markErr

        // 3. Create new draft record with amended_from reference
        const { data: newRecord, error: createErr } = await supabase
            .from(tableName)
            .insert({
                ...newData,
                status: 'draft',
                amended_from: recordId,
            })
            .select()
            .single()

        if (createErr) throw createErr

        // 4. Copy child records if needed
        if (childTableName && original[childTableName]) {
            const childRecords = original[childTableName]
            const newChildren = childRecords.map((child) => {
                const filtered = { ...child }
                childIgnoreFields.forEach((field) => delete filtered[field])
                return {
                    ...filtered,
                    [childForeignKey]: newRecord.id,
                }
            })

            if (newChildren.length > 0) {
                const { error: childErr } = await supabase.from(childTableName).insert(newChildren)
                if (childErr) throw childErr
            }
        }

        return { data: newRecord, error: null }
    } catch (error) {
        console.error(`Amendment failed for ${tableName}:`, error)
        return { data: null, error }
    }
}

/**
 * Mark a record as amended and create a new version
 * Convenience wrapper for transaksi
 */
export async function amendTransaksi(transaksiId, userId) {
    return createAmendmentRecord(
        'transaksi',
        transaksiId,
        { dibuat_oleh: userId },
        userId
    )
}

/**
 * Mark a RAB as amended and create a new version with items
 * Convenience wrapper for rab
 */
export async function amendRAB(rabId, userId) {
    return createAmendmentRecord(
        'rab',
        rabId,
        {
            diajukan_oleh: userId,
            status: 'draft',
        },
        userId,
        {
            childTableName: 'rab_item',
            childForeignKey: 'rab_id',
            childIgnoreFields: ['id', 'rab_id'],
        }
    )
}

/**
 * Mark a RAP as amended and create a new version with photos
 * Convenience wrapper for rap
 */
export async function amendRAP(rapId, userId) {
    return createAmendmentRecord(
        'rap',
        rapId,
        { dibuat_oleh: userId },
        userId,
        {
            childTableName: 'rap_foto',
            childForeignKey: 'rap_id',
            childIgnoreFields: ['id', 'rap_id'],
        }
    )
}
