-- TemanNyatet — Migration 009: protect subscription state
-- Subscription state is controlled by the server-side payment webhook.
-- Users may still update their profile fields, but never subscription fields.

CREATE OR REPLACE FUNCTION public.prevent_client_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
      OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end
      OR NEW.last_subscription_order_id IS DISTINCT FROM OLD.last_subscription_order_id
    THEN
      RAISE EXCEPTION 'Subscription status can only be changed by the payment service';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subscription_fields ON public.profiles;
CREATE TRIGGER protect_subscription_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_subscription_changes();