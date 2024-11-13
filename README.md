1. Install the tinymce, @tinymce/tinymce-react and fs-extra packages and save them to your package.json with --save.
   `npm install --save tinymce @tinymce/tinymce-react fs-extra`
   &NewLine;
   &NewLine;
2. Setup a postinstall script to copy TinyMCE to the public directory for hosting
   **_postinstall.js_**

   ```
   const path = require('path');
   const fse = require('fs-extra');
   const topDir = path.dirname(require.main.filename);

   async function copyTinyMCE() {
    try {
        await fse.emptyDir(path.join(topDir, 'public', 'tinymce'));
        await fse.copy(path.join(topDir, 'node_modules', 'tinymce'), path.join(topDir, 'public', 'tinymce'), { overwrite: true });
        console.log('TinyMCE files copied successfully.');
      } catch (err) {
        console.error('Error copying TinyMCE files:', err);
      }
   }
      copyTinyMCE();
   ```

   **_package.json_**

   ```
   {
      // ... other content omitted for brevity ...
      "scripts": {
         // ... other scripts omitted for brevity ...
         "postinstall": "node ./postinstall.js"
      }
   }
   ```

   **_.gitignore_**

   ```
   # ... other rules omitted for brevity ...
   /public/tinymce/
   ```

3. Run the postinstall to copy TinyMCE to the public directory

   ```
   npm run postinstall
   ```

4. Add this into css.

   ```
   .tox.tox-tinymce-aux,
   .tox.tox-tinymce-aux .tox-dialog {
      z-index: 2147483647 !important;
   }

   ```
