#!/bin/bash
UA="duckarchive-inspector-enrichment/1.0 (alexandrtovmach@gmail.com)"
declare -A CACHE
> court_geo_results.tsv
> court_geo_misses.tsv
while IFS=$'\t' read -r title place obl; do
  [[ "$place" == "-" ]] && continue
  key="$place|$obl"
  if [[ ! -v CACHE[$key] ]]; then
    sleep 1.1
    q="$place, Україна"; [[ "$obl" != "-" ]] && q="$place, $obl область, Україна"
    resp=$(curl -s -G "https://nominatim.openstreetmap.org/search" \
      --data-urlencode "q=$q" --data-urlencode "format=jsonv2" --data-urlencode "limit=5" \
      --data-urlencode "countrycodes=ua" --data-urlencode "accept-language=uk" -H "User-Agent: $UA")
    CACHE[$key]=$(echo "$resp" | jq -r --arg obl "$obl" \
      '[.[] | select((.addresstype=="city" or .addresstype=="town" or .addresstype=="village" or .addresstype=="hamlet" or .addresstype=="suburb" or .addresstype=="borough" or .addresstype=="municipality")
        and (($obl=="-") or (.display_name | contains($obl + " область")) or (.name=="Севастополь")))][0]
       | if . then "\(.lat)|\(.lon)|\(.display_name)" else "" end')
  fi
  res="${CACHE[$key]}"
  if [[ -n "$res" ]]; then
    IFS='|' read -r lat lng disp <<< "$res"
    printf '%s\t%s\t%s\t%s\n' "$title" "$lat" "$lng" "$disp" >> court_geo_results.tsv
  else
    printf '%s\t%s\t%s\n' "$title" "$place" "$obl" >> court_geo_misses.tsv
  fi
done < court_geo_input.tsv
echo "hits: $(wc -l < court_geo_results.tsv), misses: $(wc -l < court_geo_misses.tsv)"
