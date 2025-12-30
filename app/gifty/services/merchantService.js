import { supabase } from '../lib/supabaseClient'
import { getPlanLimit, isLimitReached, normalizePlan } from '../lib/plans'

const buildUsage = (record) => {
  const activePlan = normalizePlan(record?.active_plan)
  const totalClaimsCount = record?.total_claims_count || 0
  const limit = getPlanLimit(activePlan)
  const limitReached = isLimitReached(totalClaimsCount, activePlan)
  return {
    activePlan,
    totalClaimsCount,
    limit,
    limitReached
  }
}

export const merchantService = {
  async getByShop(shop) {
    if (!shop) return null
    const { data, error } = await supabase
      .from('merchants')
      .select('id, shop, active_plan, total_claims_count, is_trial_active, plan_started_at')
      .eq('shop', shop)
      .single()

    if (error) {
      console.error('Failed to load merchant by shop', error)
      return null
    }
    return data
  },

  async getById(merchantId) {
    if (!merchantId) return null
    const { data, error } = await supabase
      .from('merchants')
      .select('id, shop, active_plan, total_claims_count, is_trial_active, plan_started_at')
      .eq('id', merchantId)
      .single()

    if (error) {
      console.error('Failed to load merchant by id', error)
      return null
    }
    return data
  },

  async getUsage({ shop, merchantId }) {
    const record = shop ? await this.getByShop(shop) : await this.getById(merchantId)
    if (!record) {
      return buildUsage({ active_plan: 'FREE', total_claims_count: 0 })
    }
    return buildUsage(record)
  },

  async isLimitReached(merchantId) {
    const usage = await this.getUsage({ merchantId })
    return usage.limitReached
  }
}
