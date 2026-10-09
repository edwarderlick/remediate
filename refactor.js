const fs = require('fs');
let code = fs.readFileSync('contract/remediate.py', 'utf-8');

code = code.replace(/datetime\.datetime\.fromisoformat/g, 'datetime.fromisoformat');

code = code.replace(/class RemediateContract\(gl\.Contract\):/g, "class RemediateContract(gl.contract.Contract if hasattr(gl, 'contract') else gl.Contract):");

const helper = `
def get_now_unix() -> int:
    try:
        if gl_vm is not None:
            raw = gl_vm.get_timestamp()
            if isinstance(raw, datetime):
                return int(raw.timestamp())
            return parse_dt_to_unix(raw)
    except Exception:
        pass
    try:
        raw = gl.vm.get_timestamp()
        if isinstance(raw, datetime):
            return int(raw.timestamp())
        return parse_dt_to_unix(raw)
    except Exception:
        pass
    try:
        raw = getattr(gl, "message_raw", None)
        if isinstance(raw, dict):
            return parse_dt_to_unix(raw.get("datetime", ""))
    except Exception:
        pass
    return 0

def get_nonce() -> str:
    try:
        raw = getattr(gl, "message_raw", None)
        if isinstance(raw, dict):
            return str(raw.get("nonce", ""))
    except Exception:
        pass
    return ""
`;

code = code.replace(/class RemediateContract/, helper + '\nclass RemediateContract');

code = code.replace(/dt = str\(gl\.message_raw\.get\("datetime", ""\)\)\s+nonce = str\(gl\.message_raw\.get\("nonce", ""\)\)/, 'dt = str(get_now_unix())\n        nonce = get_nonce()');

code = code.replace(/now_dt = str\(gl\.message_raw\.get\("datetime", ""\)\)\n\s+now_unix = parse_dt_to_unix\(now_dt\)/g, 'now_unix = get_now_unix()\n        now_dt = str(now_unix)');

fs.writeFileSync('contract/remediate.py', code);
console.log('Refactored datetime & nonce usages.');
