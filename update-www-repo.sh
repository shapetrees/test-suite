#!/bin/sh
(cd www/ && git checkout -- .) &&
    perl -0777 -ne 'print "$&\n" if /.*## file tree/s' www/README.md > README-new.md &&
    echo "\n\`\`\`" >> README-new.md &&
    (cd www && tree .) >> README-new.md &&
    echo "\`\`\`\n\n\n## test run output\n\n\`\`\`" >> README-new.md &&
    npm test >> README-new.md &&
    echo "\`\`\`" >> README-new.md &&
    mv README-new.md www/README.md
