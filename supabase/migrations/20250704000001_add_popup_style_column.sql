-- Add popup_style column to popups table
ALTER TABLE public.popups 
ADD COLUMN popup_style TEXT DEFAULT 'native' 
CHECK (popup_style IN ('native', 'traditional', 'minimal', 'corner'));

-- Create index on popup_style for performance
CREATE INDEX idx_popups_style ON public.popups(popup_style);

-- Update existing popups to use native style by default
UPDATE public.popups SET popup_style = 'native' WHERE popup_style IS NULL;