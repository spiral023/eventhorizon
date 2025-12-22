from app.models.domain import Event

def enhance_event_with_user_names_helper(event: Event):
    """Add user_name to votes from user relationship"""
    if hasattr(event, 'votes') and event.votes:
        for vote in event.votes:
            if hasattr(vote, 'user') and vote.user:
                vote.user_name = vote.user.name
    return event

def enhance_event_with_dates_helper(event: Event):
    """Add user_name to date responses from user relationship"""
    if hasattr(event, 'date_options') and event.date_options:
        for date_opt in event.date_options:
            if hasattr(date_opt, 'responses') and date_opt.responses:
                for response in date_opt.responses:
                    if hasattr(response, 'user') and response.user:
                        response.user_name = response.user.name
                        response.user_avatar = response.user.avatar_url
    return event

def enhance_event_full(event: Event):
    enhance_event_with_user_names_helper(event)
    enhance_event_with_dates_helper(event)
    return event
