1. Install the tinymce, @tinymce/tinymce-react and fs-extra packages and save them to your package.json with --save.
   `npm install --save tinymce @tinymce/tinymce-react fs-extra`
   &NewLine;
   &NewLine;
2. Setup a postinstall script to copy TinyMCE to the public directory for hosting
   **_postinstall.js_**

   ```
   import fse from 'fs-extra';
   import path from 'path';
   const topDir = import.meta.dirname;
   fse.emptyDirSync(path.join(topDir, 'public', 'tinymce'));
   fse.copySync(path.join(topDir, 'node_modules', 'tinymce'), path.join(topDir, 'public', 'tinymce'), { overwrite: true });
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
