import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'https://jeenie.website',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Server-side pricing configuration - SYNCED with frontend (subscriptionPlans.ts)
// Prices in paise (₹1 = 100 paise)
const PLAN_CONFIG = {
  'monthly': { amount: 9900, duration: 30, name: 'Pro Monthly' },
  'yearly': { amount: 49900, duration: 365, name: 'Pro Yearly' },
  'family_yearly': { amount: 89900, duration: 365, name: 'Family Pro Yearly' }
} as const

type PlanId = keyof typeof PLAN_CONFIG

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract and validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please login to continue.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session expired. Please login again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get and validate request body - DO NOT accept duration from client
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json()
    
    // Validate planId
    if (!planId || !(planId in PLAN_CONFIG)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid plan selected. Please refresh and try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!RAZORPAY_KEY_SECRET) throw new Error('Secret not configured')

    // Verify payment signature
    const generatedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature')
    }

    // Verify the payment order exists and belongs to this user
    const { data: paymentOrder, error: orderError } = await supabase
      .from('payments')
      .select('user_id, amount, plan_id, plan_duration')
      .eq('razorpay_order_id', razorpay_order_id)
      .single()

    if (orderError || !paymentOrder) {
      throw new Error('Payment order not found')
    }

    // Verify user owns this payment
    if (paymentOrder.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment ownership mismatch. Please contact support.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get duration from SERVER CONFIG ONLY (not from client or even database)
    const duration = PLAN_CONFIG[planId as PlanId].duration
    const expectedAmount = PLAN_CONFIG[planId as PlanId].amount

    // Verify amount matches expected (optional but recommended)
    if (paymentOrder.amount !== expectedAmount) {
      console.warn(`Payment amount mismatch: expected ${expectedAmount}, got ${paymentOrder.amount}`)
    }

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + duration)

    // Update payment record with a status value that matches the
    // payments table CHECK constraint (created/paid/failed/refunded).
    await supabase.from('payments').update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'paid'
    }).eq('razorpay_order_id', razorpay_order_id)

    // Grant subscription to authenticated user only
    await supabase.from('profiles').update({
      subscription_end_date: endDate.toISOString(),
      is_premium: true
    }).eq('id', user.id)

    return new Response(
      JSON.stringify({ success: true, subscription_end_date: endDate.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('verify-payment error:', error?.message || error);
    return new Response(
      JSON.stringify({ success: false, error: 'Payment verification failed. Your payment is safe — please try again or contact support.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
