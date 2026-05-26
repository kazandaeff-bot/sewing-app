#!/bin/bash
DUMP="/home/z/my-project/download/project-dump-fixed.txt"
> "$DUMP"

add_file() {
  echo "" >> "$DUMP"
  echo "# ===== FILE: $1 =====" >> "$DUMP"
  cat "$2" >> "$DUMP"
  echo "" >> "$DUMP"
}

# Root files
add_file "package.json" "/home/z/my-project/package.json"
add_file "prisma/schema.prisma" "/home/z/my-project/prisma/schema.prisma"

# Lib
add_file "src/lib/db.ts" "/home/z/my-project/src/lib/db.ts"
add_file "src/lib/utils.ts" "/home/z/my-project/src/lib/utils.ts"

# Hooks
add_file "src/hooks/use-toast.ts" "/home/z/my-project/src/hooks/use-toast.ts"
add_file "src/hooks/use-mobile.ts" "/home/z/my-project/src/hooks/use-mobile.ts"

# Components
add_file "src/components/auth-provider.tsx" "/home/z/my-project/src/components/auth-provider.tsx"
add_file "src/components/production-tabs.tsx" "/home/z/my-project/src/components/production-tabs.tsx"
add_file "src/components/providers.tsx" "/home/z/my-project/src/components/providers.tsx"

# Pages
add_file "src/app/globals.css" "/home/z/my-project/src/app/globals.css"
add_file "src/app/layout.tsx" "/home/z/my-project/src/app/layout.tsx"
add_file "src/app/page.tsx" "/home/z/my-project/src/app/page.tsx"
add_file "src/app/login/page.tsx" "/home/z/my-project/src/app/login/page.tsx"

# API routes
for f in $(find /home/z/my-project/src/app/api -name "route.ts" | sort); do
  rel="${f#/home/z/my-project/}"
  add_file "$rel" "$f"
done

echo "Done: $DUMP"
wc -l "$DUMP"
ls -lh "$DUMP"
