import os
import sys

p = r"C:\Users\samir\AppData\Local\Programs\Python\Python312\Lib\site-packages\gltest\direct\loader.py"
with open(p, "r") as f:
    code = f.read()

replacement = """def _find_contract_class(module):
    import dataclasses
    candidates = []
    print("MODULE DIR:", dir(module))
    for name in dir(module):
        if name.startswith('_'): continue
        obj = getattr(module, name)
        if not isinstance(obj, type): continue
        if dataclasses.is_dataclass(obj): continue
        if getattr(obj, '__gl_contract__', False):
            print("FOUND via __gl_contract__:", obj)
            return obj
        for base in getattr(obj, '__mro__', []):
            if base.__name__ in ('Contract', 'gl.Contract'):
                print("FOUND via base:", obj)
                return obj
        if hasattr(obj, '__annotations__'):
            annotations = obj.__annotations__
            storage_types = ('TreeMap', 'DynArray', 'Array', 'u256', 'Address')
            for ann in annotations.values():
                ann_str = str(ann)
                if any(st in ann_str for st in storage_types):
                    candidates.append(obj)
                    break
    if candidates:
        print("FOUND via candidates:", candidates[0])
        return candidates[0]
    print("COULD NOT FIND CONTRACT")
    return None

def dummy():"""

code = code.replace("def _find_contract_class(module: Any) -> Optional[Type[Any]]:", replacement)
with open(p, "w") as f:
    f.write(code)
print("Done")
