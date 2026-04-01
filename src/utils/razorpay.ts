// src/utils/razorpay.ts
// CREATE THIS FILE - Complete Razorpay Integration

import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_PLANS } from '@/config/subscriptionPlans';
import { logger } from '@/utils/logger';

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load Razorpay script dynamically
export const loadRazorpay = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    script.onload = () => {
      if (window.Razorpay) {
        logger.info('Razorpay loaded successfully');
        resolve(window.Razorpay);
      } else {
        reject(new Error('Razorpay failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay script'));
    };
    
    document.body.appendChild(script);
  });
};

// Main payment initialization function
export const initializePayment = async (
  planId: string,
  userId: string,
  email: string,
  name: string,
  callbacks?: {
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
  }
) => {
  logger.info('Starting payment initialization...', { planId, userId });

  try {
    // 1. Validate plan
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    logger.info('Plan validated', { plan: plan.name });

    // 2. Load Razorpay SDK
    logger.info('Loading Razorpay SDK...');
    const Razorpay = await loadRazorpay();
    
    if (!Razorpay) {
      throw new Error('Razorpay SDK not available');
    }

    // 3. Create order via Supabase Edge Function
    logger.info('Creating Razorpay order...');
    const { data: orderData, error: orderError } = await supabase.functions.invoke(
      'create-razorpay-order',
      {
        body: {
          planId // Server controls amount, duration, and user ID
        }
      }
    );

    if (orderError) {
      logger.error('Order creation error (network/edge):', orderError);
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    // Edge function always returns 200 with a success flag.
    // Surface friendly errors when success is false (e.g. not logged in / session expired).
    if (!orderData || orderData.success === false) {
      logger.error('Order creation failed (app-level):', orderData);
      const reason = (orderData as any)?.error || 'Failed to create order. Please login again and retry.';
      throw new Error(reason);
    }

    if (!('orderId' in orderData)) {
      logger.error('Invalid order response shape:', orderData);
      throw new Error('Invalid order response from server');
    }

    logger.info('Order created', { orderId: (orderData as any).orderId });

    // 4. Get Razorpay Key from environment
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
    
    if (!razorpayKey) {
      throw new Error('Razorpay Key ID not configured. Please contact support.');
    }

    // Key ID is public but no need to log in production

    // 5. Razorpay Checkout Options
    const options = {
      key: razorpayKey,
      // Use the server-returned amount and currency to avoid any
      // mismatch between frontend config and backend enforcement.
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'JEEnie - JEE Prep Platform',
      description: `${plan.name} Subscription`,
      image: '/logo.png', // Optional: Add your logo
      order_id: orderData.orderId,
      
      // Prefill user details
      prefill: {
        name: name,
        email: email,
        contact: '' // Optional: Add if you have phone number
      },
      
      // Theme customization
      theme: {
        color: '#2563EB' // Brand blue – Razorpay requires hex
      },
      
      // Payment success handler
      handler: async (response: any) => {
        logger.info('Payment successful', response);
        
        try {
          // Verify payment signature
          logger.info('Verifying payment...');
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'verify-payment',
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId // Server controls duration and user ID
              }
            }
          );

          if (verifyError) {
            logger.error('Verification error (network/edge):', verifyError);
            throw new Error(`Payment verification failed: ${verifyError.message}`);
          }

          if (!verifyData || (verifyData as any).success === false) {
            logger.error('Verification failed (app-level):', verifyData);
            const reason = (verifyData as any)?.error || 'Payment verification failed on server. Please contact support.';
            throw new Error(reason);
          }

          logger.info('Payment verified', verifyData);

          // Server-side edge function already updates the profile with
          // subscription_plan, subscription_end_date, and is_premium.
          // No need to duplicate that here (avoids security risk of
          // client-side is_premium manipulation and race conditions).

          const typedVerifyData = verifyData as any;
          const endDate = typedVerifyData?.subscription_end_date 
            ? new Date(typedVerifyData.subscription_end_date) 
            : new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);

          // Success notification
          const endDateStr = endDate.toLocaleDateString();
          callbacks?.onSuccess?.(`${plan.name} activated! Valid until: ${endDateStr}`);
          
          // Redirect to dashboard
          window.location.href = '/dashboard';
          
        } catch (err: any) {
          logger.error('Payment verification failed:', err);
          callbacks?.onError?.(`Payment verification failed: ${err.message}. Please contact support if money was deducted.`);
        }
      },
      
      // Payment modal dismissed
      modal: {
        ondismiss: () => {
          logger.warn('Payment cancelled by user');
          // Optional: Show a message or log analytics
        }
      },
      
      // Notes (for internal reference)
      notes: {
        user_id: userId,
        plan_id: planId
      }
    };

    logger.info('Opening Razorpay checkout...');
    
    // 6. Open Razorpay Checkout
    const razorpayInstance = new Razorpay(options);
    razorpayInstance.open();
    
    // Handle payment failures
    razorpayInstance.on('payment.failed', (response: any) => {
      logger.error('Payment failed:', response.error);
      callbacks?.onError?.(`Payment Failed: ${response.error.description}`);
    });

  } catch (error: any) {
    logger.error('Payment initialization error:', error);
    
    // User-friendly error messages
    let errorMessage = 'Failed to initialize payment. ';
    
    if (error.message.includes('Razorpay')) {
      errorMessage += 'Payment gateway not loaded. Please refresh and try again.';
    } else if (error.message.includes('Order creation')) {
      errorMessage += 'Could not create order. Please check your connection.';
    } else if (error.message.includes('Key ID')) {
      errorMessage += 'Payment system not configured. Please contact support.';
    } else {
      errorMessage += error.message;
    }
    
    callbacks?.onError?.(errorMessage);
    throw error;
  }
};

// Helper function to check payment status
export const checkPaymentStatus = async (orderId: string) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error checking payment status:', error);
    return null;
  }
};
