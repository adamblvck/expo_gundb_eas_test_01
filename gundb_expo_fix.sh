##### Fix first file

# replace first line of code with working import
sed '1 c\
import serializeError from "serialize-error";' node_modules/webview-crypto/src/MainWorker.ts > tmp_file.ts

# overwrite file to fix, and remove tmp-file
cat tmp_file.ts > node_modules/webview-crypto/src/MainWorker.ts
rm -rf tmp_file.ts


###### Fix second file

# replace first line of code with working import
sed '1 c\
import find from "lodash/find";' node_modules/webview-crypto/src/asyncSerialize.ts > tmp_file.ts

# overwrite file to fix, and remove tmp-file
cat tmp_file.ts > node_modules/webview-crypto/src/asyncSerialize.ts
rm -rf tmp_file.ts
