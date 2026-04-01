export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          scheduled_at: string | null
          sent_by: string | null
          status: string | null
          target_audience: string | null
          target_user_ids: Json | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          scheduled_at?: string | null
          sent_by?: string | null
          status?: string | null
          target_audience?: string | null
          target_user_ids?: Json | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_by?: string | null
          status?: string | null
          target_audience?: string | null
          target_user_ids?: Json | null
          title?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string | null
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number | null
        }
        Insert: {
          badge_type?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required?: number | null
        }
        Update: {
          badge_type?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number | null
        }
        Relationships: []
      }
      batch_subjects: {
        Row: {
          batch_id: string
          created_at: string | null
          display_order: number | null
          id: string
          subject: string
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          subject: string
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_subjects_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          exam_type: string
          features: Json | null
          grade: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          name: string
          offer_price: number | null
          price: number | null
          slug: string | null
          thumbnail_url: string | null
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          exam_type: string
          features?: Json | null
          grade?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          name: string
          offer_price?: number | null
          price?: number | null
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          exam_type?: string
          features?: Json | null
          grade?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          name?: string
          offer_price?: number | null
          price?: number | null
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          batch_id: string | null
          chapter_name: string
          chapter_number: number | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          chapter_name: string
          chapter_number?: number | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          chapter_name?: string
          chapter_number?: number | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_prompts: {
        Row: {
          converted: boolean | null
          created_at: string | null
          id: string
          prompt_type: string
          shown_at: string | null
          user_id: string
        }
        Insert: {
          converted?: boolean | null
          created_at?: string | null
          id?: string
          prompt_type: string
          shown_at?: string | null
          user_id: string
        }
        Update: {
          converted?: boolean | null
          created_at?: string | null
          id?: string
          prompt_type?: string
          shown_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_progress: {
        Row: {
          accuracy_7day: number | null
          created_at: string | null
          daily_target: number | null
          date: string
          id: string
          points_earned: number | null
          questions_attempted: number | null
          questions_completed: number | null
          questions_correct: number | null
          streak_maintained: boolean | null
          study_time: number | null
          target_met: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_7day?: number | null
          created_at?: string | null
          daily_target?: number | null
          date?: string
          id?: string
          points_earned?: number | null
          questions_attempted?: number | null
          questions_completed?: number | null
          questions_correct?: number | null
          streak_maintained?: boolean | null
          study_time?: number | null
          target_met?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_7day?: number | null
          created_at?: string | null
          daily_target?: number | null
          date?: string
          id?: string
          points_earned?: number | null
          questions_attempted?: number | null
          questions_completed?: number | null
          questions_correct?: number | null
          streak_maintained?: boolean | null
          study_time?: number | null
          target_met?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      educator_content: {
        Row: {
          chapter_id: string | null
          content_type: string
          created_at: string
          description: string | null
          display_order: number
          embed_url: string | null
          file_path: string | null
          grade: number
          id: string
          is_active: boolean
          original_filename: string | null
          subject: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          chapter_id?: string | null
          content_type: string
          created_at?: string
          description?: string | null
          display_order?: number
          embed_url?: string | null
          file_path?: string | null
          grade: number
          id?: string
          is_active?: boolean
          original_filename?: string | null
          subject: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          chapter_id?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          embed_url?: string | null
          file_path?: string | null
          grade?: number
          id?: string
          is_active?: boolean
          original_filename?: string | null
          subject?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "educator_content_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_config: {
        Row: {
          created_at: string | null
          description: string | null
          exam_date: string | null
          exam_name: string
          id: string
          is_active: boolean | null
          registration_deadline: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          exam_date?: string | null
          exam_name: string
          id?: string
          is_active?: boolean | null
          registration_deadline?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          exam_date?: string | null
          exam_name?: string
          id?: string
          is_active?: boolean | null
          registration_deadline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      extracted_questions_queue: {
        Row: {
          created_at: string | null
          id: string
          page_number: number | null
          parsed_question: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_file: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_number?: number | null
          parsed_question?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page_number?: number | null
          parsed_question?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          flag_key: string
          id: string
          is_enabled: boolean
          label: string
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          flag_key: string
          id?: string
          is_enabled?: boolean
          label: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          label?: string
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      free_content_limits: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          limit_type: string
          limit_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          limit_type: string
          limit_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          limit_type?: string
          limit_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      group_tests: {
        Row: {
          chapter_names: Json | null
          created_at: string | null
          created_by: string
          duration_minutes: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          question_ids: Json
          subject: string | null
          test_code: string
          title: string
          updated_at: string | null
        }
        Insert: {
          chapter_names?: Json | null
          created_at?: string | null
          created_by: string
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          question_ids?: Json
          subject?: string | null
          test_code: string
          title: string
          updated_at?: string | null
        }
        Update: {
          chapter_names?: Json | null
          created_at?: string | null
          created_by?: string
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          question_ids?: Json
          subject?: string | null
          test_code?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_audit: {
        Row: {
          changed_at: string
          changed_by_user: string | null
          id: string
          payment_id: string
          payment_table: string
          razorpay_order_id: string | null
          status_from: string | null
          status_to: string | null
        }
        Insert: {
          changed_at?: string
          changed_by_user?: string | null
          id?: string
          payment_id: string
          payment_table: string
          razorpay_order_id?: string | null
          status_from?: string | null
          status_to?: string | null
        }
        Update: {
          changed_at?: string
          changed_by_user?: string | null
          id?: string
          payment_id?: string
          payment_table?: string
          razorpay_order_id?: string | null
          status_from?: string | null
          status_to?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          plan_duration: number | null
          plan_id: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          batch_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          plan_duration?: number | null
          plan_id?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          plan_duration?: number | null
          plan_id?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: Json | null
          city: string | null
          created_at: string | null
          current_streak: number | null
          daily_goal: number | null
          daily_question_limit: number | null
          educator_approved: boolean | null
          email: string | null
          full_name: string | null
          goal_locked: boolean | null
          goal_locked_at: string | null
          grade: number | null
          id: string
          is_premium: boolean | null
          last_activity: string | null
          last_activity_date: string | null
          last_streak_date: string | null
          level: string | null
          level_progress: number | null
          longest_streak: number | null
          overall_accuracy: number | null
          phone: string | null
          questions_completed: number | null
          referral_code: string | null
          referred_by: string | null
          smart_goal_enabled: boolean | null
          state: string | null
          streak_freeze_available: boolean | null
          subjects: string[] | null
          subscription_end_date: string | null
          target_exam: string | null
          target_exam_date: string | null
          total_points: number | null
          total_questions_solved: number | null
          total_study_time: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json | null
          city?: string | null
          created_at?: string | null
          current_streak?: number | null
          daily_goal?: number | null
          daily_question_limit?: number | null
          educator_approved?: boolean | null
          email?: string | null
          full_name?: string | null
          goal_locked?: boolean | null
          goal_locked_at?: string | null
          grade?: number | null
          id: string
          is_premium?: boolean | null
          last_activity?: string | null
          last_activity_date?: string | null
          last_streak_date?: string | null
          level?: string | null
          level_progress?: number | null
          longest_streak?: number | null
          overall_accuracy?: number | null
          phone?: string | null
          questions_completed?: number | null
          referral_code?: string | null
          referred_by?: string | null
          smart_goal_enabled?: boolean | null
          state?: string | null
          streak_freeze_available?: boolean | null
          subjects?: string[] | null
          subscription_end_date?: string | null
          target_exam?: string | null
          target_exam_date?: string | null
          total_points?: number | null
          total_questions_solved?: number | null
          total_study_time?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: Json | null
          city?: string | null
          created_at?: string | null
          current_streak?: number | null
          daily_goal?: number | null
          daily_question_limit?: number | null
          educator_approved?: boolean | null
          email?: string | null
          full_name?: string | null
          goal_locked?: boolean | null
          goal_locked_at?: string | null
          grade?: number | null
          id?: string
          is_premium?: boolean | null
          last_activity?: string | null
          last_activity_date?: string | null
          last_streak_date?: string | null
          level?: string | null
          level_progress?: number | null
          longest_streak?: number | null
          overall_accuracy?: number | null
          phone?: string | null
          questions_completed?: number | null
          referral_code?: string | null
          referred_by?: string | null
          smart_goal_enabled?: boolean | null
          state?: string | null
          streak_freeze_available?: boolean | null
          subjects?: string[] | null
          subscription_end_date?: string | null
          target_exam?: string | null
          target_exam_date?: string | null
          total_points?: number | null
          total_questions_solved?: number | null
          total_study_time?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          attempted_at: string | null
          created_at: string | null
          id: string
          is_correct: boolean
          mode: string | null
          points_earned: number | null
          question_id: string
          selected_option: string | null
          time_spent: number | null
          user_id: string
        }
        Insert: {
          attempted_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          mode?: string | null
          points_earned?: number | null
          question_id: string
          selected_option?: string | null
          time_spent?: number | null
          user_id: string
        }
        Update: {
          attempted_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          mode?: string | null
          points_earned?: number | null
          question_id?: string
          selected_option?: string | null
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      question_edit_history: {
        Row: {
          edit_reason: string | null
          edited_at: string
          edited_by: string | null
          id: string
          previous_answer: string | null
          previous_explanation: string | null
          previous_options: Json | null
          previous_question: string | null
          question_id: string
        }
        Insert: {
          edit_reason?: string | null
          edited_at?: string
          edited_by?: string | null
          id?: string
          previous_answer?: string | null
          previous_explanation?: string | null
          previous_options?: Json | null
          previous_question?: string | null
          question_id: string
        }
        Update: {
          edit_reason?: string | null
          edited_at?: string
          edited_by?: string | null
          id?: string
          previous_answer?: string | null
          previous_explanation?: string | null
          previous_options?: Json | null
          previous_question?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_edit_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_edit_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          question_id: string
          reason: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          question_id: string
          reason: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          question_id?: string
          reason?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          batch_id: string | null
          chapter: string | null
          chapter_id: string | null
          correct_option: string
          created_at: string | null
          difficulty: string | null
          exam: string | null
          explanation: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          question_type: string | null
          subject: string
          subtopic: string | null
          topic: string | null
          topic_id: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          batch_id?: string | null
          chapter?: string | null
          chapter_id?: string | null
          correct_option: string
          created_at?: string | null
          difficulty?: string | null
          exam?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          question_type?: string | null
          subject: string
          subtopic?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          batch_id?: string | null
          chapter?: string | null
          chapter_id?: string | null
          correct_option?: string
          created_at?: string | null
          difficulty?: string | null
          exam?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          question_type?: string | null
          subject?: string
          subtopic?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_points: number | null
          created_at: string | null
          id: string
          referral_code: string
          referred_email: string | null
          referred_id: string
          referrer_id: string
          reward_granted: boolean | null
          status: string | null
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_id: string
          referrer_id: string
          reward_granted?: boolean | null
          status?: string | null
        }
        Update: {
          bonus_points?: number | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_id?: string
          referrer_id?: string
          reward_granted?: boolean | null
          status?: string | null
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string | null
          daily_hours: number | null
          id: string
          is_active: boolean | null
          plan_data: Json | null
          target_date: string | null
          target_exam: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_hours?: number | null
          id?: string
          is_active?: boolean | null
          plan_data?: Json | null
          target_date?: string | null
          target_exam?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_hours?: number | null
          id?: string
          is_active?: boolean | null
          plan_data?: Json | null
          target_date?: string | null
          target_exam?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: string | null
          session_id: string | null
          time_spent: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: string | null
          session_id?: string | null
          time_spent?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: string | null
          session_id?: string | null
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_test_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          accuracy: number | null
          answers: Json | null
          attempted_questions: number | null
          batch_id: string | null
          completed_at: string | null
          correct_answers: number | null
          created_at: string | null
          group_test_id: string | null
          id: string
          question_ids: Json | null
          score: number | null
          started_at: string | null
          status: string | null
          subject: string | null
          time_taken: number | null
          title: string | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          answers?: Json | null
          attempted_questions?: number | null
          batch_id?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          group_test_id?: string | null
          id?: string
          question_ids?: Json | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          subject?: string | null
          time_taken?: number | null
          title?: string | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          answers?: Json | null
          attempted_questions?: number | null
          batch_id?: string | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          group_test_id?: string | null
          id?: string
          question_ids?: Json | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          subject?: string | null
          time_taken?: number | null
          title?: string | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sessions_group_test_id_fkey"
            columns: ["group_test_id"]
            isOneToOne: false
            referencedRelation: "group_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_mastery: {
        Row: {
          accuracy: number | null
          chapter: string | null
          created_at: string | null
          current_level: string | null
          id: string
          last_attempted: string | null
          last_practiced: string | null
          mastery_level: number | null
          questions_attempted: number | null
          questions_correct: number | null
          subject: string | null
          topic: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          chapter?: string | null
          created_at?: string | null
          current_level?: string | null
          id?: string
          last_attempted?: string | null
          last_practiced?: string | null
          mastery_level?: number | null
          questions_attempted?: number | null
          questions_correct?: number | null
          subject?: string | null
          topic?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          chapter?: string | null
          created_at?: string | null
          current_level?: string | null
          id?: string
          last_attempted?: string | null
          last_practiced?: string | null
          mastery_level?: number | null
          questions_attempted?: number | null
          questions_correct?: number | null
          subject?: string | null
          topic?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          chapter_id: string
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          estimated_time: number | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          order_index: number | null
          topic_name: string
          topic_number: number | null
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          order_index?: number | null
          topic_name: string
          topic_number?: number | null
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          order_index?: number | null
          topic_name?: string
          topic_number?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_batch_subscriptions: {
        Row: {
          amount_paid: number | null
          batch_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          payment_id: string | null
          purchased_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          batch_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          purchased_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          batch_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          purchased_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_batch_subscriptions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_content_access: {
        Row: {
          accessed_at: string | null
          content_id: string
          content_identifier: string | null
          content_type: string
          id: string
          subject: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          content_id: string
          content_identifier?: string | null
          content_type: string
          id?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          content_id?: string
          content_identifier?: string | null
          content_type?: string
          id?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      group_test_leaderboard: {
        Row: {
          accuracy: number | null
          attempted_questions: number | null
          avatar_url: string | null
          completed_at: string | null
          correct_answers: number | null
          full_name: string | null
          group_test_id: string | null
          id: string | null
          score: number | null
          status: string | null
          time_taken: number | null
          total_questions: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_group_test_id_fkey"
            columns: ["group_test_id"]
            isOneToOne: false
            referencedRelation: "group_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_public: {
        Row: {
          batch_id: string | null
          chapter: string | null
          chapter_id: string | null
          created_at: string | null
          difficulty: string | null
          exam: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          question: string | null
          question_type: string | null
          subject: string | null
          subtopic: string | null
          topic: string | null
          topic_id: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          batch_id?: string | null
          chapter?: string | null
          chapter_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          exam?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question?: string | null
          question_type?: string | null
          subject?: string | null
          subtopic?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          batch_id?: string | null
          chapter?: string | null
          chapter_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          exam?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question?: string | null
          question_type?: string | null
          subject?: string | null
          subtopic?: string | null
          topic?: string | null
          topic_id?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_subscription: { Args: never; Returns: Json }
      change_user_goal: {
        Args: {
          p_confirm_reset?: boolean
          p_new_goal: string
          p_new_grade: number
          p_new_target_exam: string
          p_user_id: string
        }
        Returns: Json
      }
      check_and_reset_streak: { Args: { p_user_id: string }; Returns: Json }
      classify_questions_batch: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      cleanup_expired_subscriptions: { Args: never; Returns: undefined }
      create_referral: { Args: { p_referral_code: string }; Returns: Json }
      delete_duplicate_questions: { Args: never; Returns: Json }
      ensure_policy: {
        Args: { p_cmd: string; p_name: string; p_table: string }
        Returns: undefined
      }
      fix_chapter_batch_distribution: { Args: never; Returns: Json }
      fn_expire_batch_subscriptions: { Args: never; Returns: undefined }
      get_leaderboard_with_stats: {
        Args: { limit_count?: number }
        Returns: {
          accuracy: number
          avatar_url: string
          current_streak: number
          full_name: string
          id: string
          total_points: number
          total_questions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_points: {
        Args: {
          p_action_type: string
          p_description?: string
          p_points: number
          p_reference_id?: string
          p_user_id: string
        }
        Returns: string
      }
      reset_user_progress: { Args: { p_user_id: string }; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_own_profile: {
        Args: {
          p_avatar_url?: string
          p_city?: string
          p_daily_goal?: number
          p_full_name?: string
          p_grade?: number
          p_phone?: string
          p_smart_goal_enabled?: boolean
          p_state?: string
          p_subjects?: string[]
          p_target_exam?: string
          p_target_exam_date?: string
        }
        Returns: undefined
      }
      update_practice_stats: {
        Args: {
          p_is_correct: boolean
          p_points_delta: number
          p_user_id: string
        }
        Returns: Json
      }
      update_streak_stats: { Args: { p_user_id: string }; Returns: Json }
      upsert_topic_mastery: {
        Args: {
          p_chapter: string
          p_is_correct: boolean
          p_subject: string
          p_topic: string
          p_topic_id: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_question_answer: {
        Args: { p_question_id: string; p_selected_option: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "super_admin" | "student" | "educator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "super_admin", "student", "educator"],
    },
  },
} as const
