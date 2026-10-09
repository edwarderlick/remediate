import os

_original_unlink = os.unlink
_original_remove = os.remove

def safe_unlink(path, *args, **kwargs):
    try:
        _original_unlink(path, *args, **kwargs)
    except Exception as e:
        if "WinError 32" in str(e) or getattr(e, "winerror", 0) == 32:
            pass
        else:
            raise

def safe_remove(path, *args, **kwargs):
    try:
        _original_remove(path, *args, **kwargs)
    except Exception as e:
        if "WinError 32" in str(e) or getattr(e, "winerror", 0) == 32:
            pass
        else:
            raise

os.unlink = safe_unlink
os.remove = safe_remove
