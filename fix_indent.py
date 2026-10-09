path = "tests/direct/test_remediate.py"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
in_test = False
for line in lines:
    if line.startswith("def test_cancel_before_deadline_reverts"):
        in_test = True
        new_lines.append(line)
    elif in_test:
        if line.startswith("        "):
            new_lines.append(line[4:])
        elif line.startswith("    "):
            new_lines.append(line) # already correct? Wait, if it's 4 spaces, it shouldn't be touched if it's inside the function. Oh, my unindent already unindented the def line! So the body is 8 spaces indented!
        elif line.strip() == "":
            new_lines.append(line)
        else:
            in_test = False
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
