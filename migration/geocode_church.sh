#!/bin/bash
UA="duckarchive-inspector-enrichment/1.0 (alexandrtovmach@gmail.com)"
declare -A C1 C2
degen() { local p="$1"
  case "$p" in
    Бахчисараю) p="Бахчисарай";; "Євпаторії") p="Євпаторія";; Сімферополя) p="Сімферополь";;
    Маріуполя) p="Маріуполь";; Бердянську) p="Бердянськ";;
  esac; echo "$p"; }
> church_geo_results.tsv; > church_geo_misses.tsv
while IFS=$'\t' read -r title place obl; do
  [[ "$place" == "-" ]] && continue
  p=$(degen "$place"); res=""
  if [[ "$obl" != "-" ]]; then
    k="$p|$obl"
    if [[ ! -v C1[$k] ]]; then
      sleep 1.1
      C1[$k]=$(curl -s -G "https://nominatim.openstreetmap.org/search" \
        --data-urlencode "q=$p, $obl область, Україна" --data-urlencode "format=jsonv2" --data-urlencode "limit=5" \
        --data-urlencode "countrycodes=ua" --data-urlencode "accept-language=uk" -H "User-Agent: $UA" | \
        jq -r --arg obl "$obl область" '[.[] | select((.addresstype=="city" or .addresstype=="town" or .addresstype=="village" or .addresstype=="hamlet" or .addresstype=="suburb" or .addresstype=="borough" or .addresstype=="quarter")
          and ((.display_name | contains($obl)) or (.name=="Київ" and .addresstype=="city") or (.display_name | contains("Севастополь")) or (.display_name | contains("Автономна Республіка Крим"))))][0]
         | if . then "\(.lat)|\(.lon)|\(.display_name)" else "" end')
    fi
    res="${C1[$k]}"
  fi
  if [[ -z "$res" ]]; then
    if [[ ! -v C2[$p] ]]; then
      sleep 1.1
      C2[$p]=$(curl -s -G "https://nominatim.openstreetmap.org/search" \
        --data-urlencode "q=$p, Україна" --data-urlencode "format=jsonv2" --data-urlencode "limit=5" \
        --data-urlencode "countrycodes=ua" --data-urlencode "accept-language=uk" -H "User-Agent: $UA" | \
        jq -r --arg p "$p" '[.[] | select((.addresstype=="city" or .addresstype=="town" or .addresstype=="village" or .addresstype=="hamlet" or .addresstype=="suburb" or .addresstype=="quarter") and (.name==$p))][0]
         | if . then "\(.lat)|\(.lon)|\(.display_name)" else "" end')
    fi
    res="${C2[$p]}"
  fi
  if [[ -n "$res" ]]; then
    IFS='|' read -r lat lng disp <<< "$res"
    printf '%s\t%s\t%s\t%s\n' "$title" "$lat" "$lng" "$disp" >> church_geo_results.tsv
  else
    printf '%s\t%s\t%s\n' "$title" "$p" "$obl" >> church_geo_misses.tsv
  fi
done < church_geo_todo.tsv
echo "hits: $(wc -l < church_geo_results.tsv), misses: $(wc -l < church_geo_misses.tsv)"
