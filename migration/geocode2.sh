#!/bin/bash
UA="duckarchive-inspector-enrichment/1.0 (alexandrtovmach@gmail.com)"
geocode() { # $1 query $2 oblast → GEO_RES
  sleep 1.1
  local resp=$(curl -s -G "https://nominatim.openstreetmap.org/search" \
    --data-urlencode "q=$1, $2 область, Україна" \
    --data-urlencode "format=jsonv2" --data-urlencode "limit=5" \
    --data-urlencode "countrycodes=ua" --data-urlencode "accept-language=uk" \
    -H "User-Agent: $UA")
  GEO_RES=$(echo "$resp" | jq -r --arg obl "$2 область" \
    '[.[] | select((.addresstype=="city" or .addresstype=="town" or .addresstype=="village" or .addresstype=="hamlet" or .addresstype=="suburb" or .addresstype=="borough" or .addresstype=="municipality")
      and ((.display_name | contains($obl)) or (.name=="Київ" and .addresstype=="city")))][0]
     | if . then "\(.lat)|\(.lon)|\(.display_name)" else "" end')
}
> ane_geo_results.tsv
> ane_geo_misses.tsv
while IFS=$'\t' read -r title query alt oblast; do
  geocode "$query" "$oblast"
  [[ -z "$GEO_RES" && "$alt" != "-" ]] && geocode "$alt" "$oblast"
  if [[ -n "$GEO_RES" ]]; then
    IFS='|' read -r lat lng disp <<< "$GEO_RES"
    printf '%s\t%s\t%s\t%s\n' "$title" "$lat" "$lng" "$disp" >> ane_geo_results.tsv
  else
    printf '%s\t%s\t%s\n' "$title" "$query" "$oblast" >> ane_geo_misses.tsv
  fi
done < ane_geo_map2.tsv
echo "hits: $(wc -l < ane_geo_results.tsv), misses: $(wc -l < ane_geo_misses.tsv)"
