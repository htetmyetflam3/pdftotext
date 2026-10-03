#!/usr/bin/env bash
# Adversarial upload probe — real curl, shaped like the SPA's multipart POST,
# then deliberately malformed. Run against a throwaway server; see the .mjs
# harness that launches it. Every case prints the HTTP status and the body.
set -u
BASE="${BASE:-http://127.0.0.1:3377}"
UA="${UA:-Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36}"
JARDIR="$(mktemp -d)"
PDF="${PDF:-frontend/frontend-bootstrap/public/samples/sample.pdf}"
BIGMETA="$(mktemp)"; python3 -c 'print("{\"v\":1,\"pad\":\"" + "A"*1000000 + "\"}")' > "$BIGMETA"

pass=0; flagged=0
say() { printf '%-54s %s\n' "$1" "$2"; }
# Each case gets a FRESH visitor, or the 3/day quota masks every result after
# the third upload with a 429 before validation ever runs.
NEW=0
fresh() {
  NEW=$((NEW+1)); JAR="$JARDIR/j$NEW"
  TOKEN="$(curl -sS -c "$JAR" -H "user-agent: $UA" "$BASE/csrf-token" \
    | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')"
  H=(-b "$JAR" -c "$JAR" -H "user-agent: $UA" -H "x-csrf-token: $TOKEN")
}

# $1 label, $2 expected-regex for the status, $3.. curl args
probe() {
  local label="$1" expect="$2"; shift 2
  local out code body
  out="$(curl -sS -o /tmp/ap.body -w '%{http_code}' "$@" 2>/tmp/ap.err)"
  code="$out"; body="$(head -c 150 /tmp/ap.body | tr -d '\n')"
  if [[ "$code" =~ $expect ]]; then pass=$((pass+1)); say "  OK   $label" "$code  $body"
  else flagged=$((flagged+1)); say "  BUG  $label" "$code  $body  (wanted $expect)"; fi
}

# ---- a real browser-shaped session first -------------------------------
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
echo "stamp: $STAMP   (a fresh visitor is minted per case)"
echo

meta() { # $1 uploadName, $2 originalName, rest = raw JSON extras
  local up="$1" orig="$2"; shift 2
  printf '{"v":1,"task":"conversion","originalName":"%s","uploadName":"%s","inputFormat":"pdf","outputFormat":"txt","content":"text","job":"extracting","method":"default","clickedAt":"%s","detector":{"name":"pdf.js","pages":1,"textPages":1,"imagePages":0,"myanmarChars":1,"myanmarLetters":1,"imageBytes":0,"textBytes":1,"confirmed":true}%s}' \
    "$orig" "$up" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${1:-}"
}
echo "── 1. the legitimate shape (control) ─────────────────────────────────"
GOOD="${STAMP}__sample.pdf"
fresh
probe "well-formed frontend upload" '^202$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" -F "metadata=$(meta "$GOOD" sample.pdf)"

echo
echo "── 2. filenames that try to be configuration ─────────────────────────"
for FN in 'MODE=development.pdf' 'Mode=development' '.env' 'ALLOW_AGENT_UPLOAD=true.pdf' \
          'DEV_BYPASS_IP=127.0.0.1.pdf'; do
  fresh
  probe "filename '$FN'" '^(400|403)$' "${H[@]}" -X POST "$BASE/api/submit" \
    -F "file=@${PDF};filename=${FN};type=application/pdf" -F "metadata=$(meta "$FN" "$FN")"
done

echo
echo "── 3. path traversal / injection in the filename ─────────────────────"
for FN in '../../../../etc/passwd.pdf' "${STAMP}__../../etc/passwd.pdf" \
          "${STAMP}__a\$(id).pdf" "${STAMP}__a;rm -rf /.pdf" "${STAMP}__a\`id\`.pdf"; do
  fresh
  probe "filename '${FN:0:40}'" '^(400|403)$' "${H[@]}" -X POST "$BASE/api/submit" \
    -F "file=@${PDF};filename=${FN};type=application/pdf" -F "metadata=$(meta "$FN" sample.pdf)"
done

echo
echo "── 4. metadata carrying config / pollution / injection ───────────────"
fresh
probe "metadata with MODE + bypass keys injected" '^(202|400)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" \
  -F "metadata=$(meta "$GOOD" sample.pdf ',"MODE":"development","ALLOW_AGENT_UPLOAD":"true","DEV_BYPASS_QUOTA":"true","DEV_BYPASS_IP":"127.0.0.1"')"
fresh
probe "metadata __proto__ pollution" '^(202|400)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" \
  -F "metadata=$(meta "$GOOD" sample.pdf ',"__proto__":{"isAdmin":true},"constructor":{"prototype":{"x":1}}')"
fresh
probe "metadata SQL in originalName" '^(400)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" \
  -F "metadata=$(meta "$GOOD" "'; DROP TABLE users;--.pdf")"
fresh
probe "metadata duplicated (array)" '^(400)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" \
  -F "metadata=$(meta "$GOOD" sample.pdf)" -F "metadata=$(meta "$GOOD" sample.pdf)"
fresh
probe "metadata absent entirely" '^400$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf"
fresh
probe "metadata not JSON" '^400$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" -F "metadata=not-json{{{"
fresh
probe "metadata huge (1MB of junk)" '^(400|413)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" \
  -F "metadata=<$BIGMETA"   # via file: 1MB inline would blow ARG_MAX, not the server

echo
echo "── 5. multipart shape abuse ──────────────────────────────────────────"
fresh
probe "two file parts" '^(400|202)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" \
  -F "file=@${PDF};filename=${STAMP}__second.pdf;type=application/pdf" \
  -F "metadata=$(meta "$GOOD" sample.pdf)"
fresh
probe "unexpected field name" '^400$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "evil=@${PDF};filename=${GOOD};type=application/pdf" -F "metadata=$(meta "$GOOD" sample.pdf)"
fresh
probe "50 junk text fields alongside" '^(202|400|413)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" -F "metadata=$(meta "$GOOD" sample.pdf)" \
  $(for i in $(seq 1 50); do printf -- "-Fspam%d=%s " "$i" "$(head -c 200 /dev/zero | tr '\0' 'x')"; done)
fresh
probe "content-type lies (docx for a pdf)" '^(400|422)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${STAMP}__x.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  -F "metadata=$(printf '{"v":1,"task":"conversion","originalName":"x.docx","uploadName":"%s__x.docx","inputFormat":"docx","outputFormat":"txt","content":"text","job":"extracting","method":"default","clickedAt":"%s","detector":{"name":"mammoth","pages":1,"textPages":1,"imagePages":0,"myanmarChars":1,"myanmarLetters":1,"imageBytes":0,"textBytes":1,"confirmed":true}}' "$STAMP" "$(date -u +%Y-%m-%dT%H:%M:%SZ)")"

echo
echo "── 6. header spoofing for the edge / bypass identity ─────────────────"
fresh
probe "spoofed CF + edge + forwarded headers" '^(202|403|429)$' "${H[@]}" -X POST "$BASE/api/submit" \
  -H "cf-connecting-ip: 127.0.0.1" -H "cf-ipcountry: MM" -H "x-edge-worker: 1" \
  -H "x-edge-secret: guess" -H "x-forwarded-for: 127.0.0.1" -H "x-forwarded-proto: https" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" -F "metadata=$(meta "$GOOD" sample.pdf)"
fresh
probe "bot user-agent" '^403$' -b "$JAR" -H "user-agent: curl/8.0" -H "x-csrf-token: $TOKEN" \
  -X POST "$BASE/api/submit" \
  -F "file=@${PDF};filename=${GOOD};type=application/pdf" -F "metadata=$(meta "$GOOD" sample.pdf)"

echo
echo "── 7. quota spam: 10 rapid well-formed uploads ───────────────────────"
accepted=0; refused=0
fresh   # one visitor on purpose: this case IS the quota test
for i in $(seq 1 10); do
  FN="${STAMP}__spam${i}.pdf"
  c=$(curl -sS -o /dev/null -w '%{http_code}' "${H[@]}" -X POST "$BASE/api/submit" \
      -F "file=@${PDF};filename=${FN};type=application/pdf" -F "metadata=$(meta "$FN" sample.pdf)")
  [[ "$c" == "202" ]] && accepted=$((accepted+1)) || refused=$((refused+1))
done
if (( accepted <= 3 )); then pass=$((pass+1)); say "  OK   10 uploads, quota held" "$accepted accepted / $refused refused"
else flagged=$((flagged+1)); say "  BUG  10 uploads OVERRAN quota" "$accepted accepted"; fi

echo
echo "── 8. did any of it leave files behind? ──────────────────────────────"
rm -rf "$JARDIR" "$BIGMETA"
echo "pass=$pass flagged=$flagged"
