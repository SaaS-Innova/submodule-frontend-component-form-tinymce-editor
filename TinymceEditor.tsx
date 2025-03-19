import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Editor } from '@tinymce/tinymce-react';
import { inputValidator } from '../../../../library/utilities/helperFunction';
import { IFormFieldType } from '../../../../library/utilities/constant';
import { FormFieldError } from '../formFieldError/FormFieldError';
import { ITinymceEditorProps } from './TinymceEditor.model';
import { Editor as IEditor } from 'tinymce';

const validImageTypes = ['jpeg', 'png', 'jpg', 'gif'];
const validImageMimeTypes = validImageTypes.map((type) => `image/${type}`);
const DRAFT_PREFIX = 'tinymce-draft-';

const contentStyle = `
  body { 
    font-family: Helvetica, Arial, sans-serif; 
    font-size: 14px; 
    line-height: 1.5; 
  } 
  p, h1, h2, h3, h4, h5, h6 { 
    margin: 0px; 
  }
`;
const styleTag = `<style>${contentStyle}</style>`;


const parseRetentionDuration = (duration: string): number => {
  // Supports seconds (s), minutes (m), hours (h), and days (d)
  const regex = /^(\d+)([smhd])$/;
  const matches = duration.match(regex);
  if (!matches) {
    return 60000;
  }
  const value = parseInt(matches[1], 10);
  const unit = matches[2];
  switch (unit) {
    case 's': // seconds
      return value * 1000;
    case 'm': // minutes
      return value * 60 * 1000;
    case 'h': // hours
      return value * 60 * 60 * 1000;
    case 'd': // days
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60000;
  }
};

/**
 * Retrieve all draft items from localStorage.
 */
const getAllDrafts = (
  autosavePrefix: string = '',
  autosaveRetention?: string,
): Array<{ key: string; content: string; id: number }> => {
  const drafts: Array<{ key: string; content: string; id: number }> = [];
  const retentionMs = autosaveRetention ? parseRetentionDuration(autosaveRetention) : null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DRAFT_PREFIX)) {
      // Process keys that end with 'draft'
      if (key.endsWith('draft')) {
        const content = localStorage.getItem(key) || '';
        // Remove the DRAFT_PREFIX and 'draft' literal, then remove the autosavePrefix part
        const idString = key
          .replace(DRAFT_PREFIX, '')
          .replace('draft', '')
          .replace(`${autosavePrefix}-`, '');

        // Extract the prefix from the modified key for exact matching
        const [keyPrefix] = key
          .replace(DRAFT_PREFIX, '')
          .replace('draft', '')
          .split('-');

        // Only include drafts with a prefix exactly matching autosavePrefix
        if (keyPrefix === autosavePrefix) {
          const id = Number(parseInt(idString, 10) || 0);
          drafts.push({ key, content, id });
        }
      }
      // Process keys that end with 'time' for retention purposes
      else if (key.endsWith('time') && retentionMs) {
        const timeValue = localStorage.getItem(key) || '';
        if (new Date().getTime() - Number(timeValue) > retentionMs) {
          localStorage.removeItem(key);
          localStorage.removeItem(key.replace('time', 'draft'));
        }
      }
    }
  }
  // Sort drafts in descending order by id
  drafts.sort((a, b) => b.id - a.id);
  return drafts;
};


/**
 * Capitalizes the first letter of each sentence in the given text.
 */
const capitalizeSentences = (text: string): string =>
  text
    .split(/([.!?]\s+)/g)
    .map((sentence, index, arr) => {
      if (index === 0 || /[.!?]\s+$/.test(arr[index - 1])) {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      }
      return sentence;
    })
    .join('');

/**
 * Walks through text nodes in the editor and updates them with capitalized sentences.
 */
const updateTextNodesWithCapitalization = (editor: IEditor) => {
  const body = editor.getBody();
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeValue) {
      const newText = capitalizeSentences(node.nodeValue);
      if (node.nodeValue !== newText) {
        node.nodeValue = newText;
      }
    }
  }
};

/**
 * Sets up custom toolbar functionalities, including a "Saved Drafts" button,
 * custom Tab key behavior, and live capitalization.
 */
const setupCustomToolbar = (editor: IEditor, autosavePrefix: string = '') => {
  // Add custom "Saved Drafts" menu button.
  if (autosavePrefix) {
    editor.ui.registry.addMenuButton('drafts', {
      text: 'Saved Drafts',
      fetch: (callback) => {
        const drafts = getAllDrafts(autosavePrefix);
        const items: any = drafts.map((draft) => ({
          type: 'menuitem',
          text: draft.key.replace(DRAFT_PREFIX, '').replace('draft', ''),
          onAction: () => editor.setContent(draft.content),
        }));
        callback(items);
      },
    });
  }

  // Insert 4 non-breaking spaces on Tab key press ('    ').
  editor.on('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      editor.execCommand('mceInsertContent', false, '    ');
    }
  });

  // Capitalize sentence beginnings when space or Enter is pressed.
  editor.on('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      // Save current selection.
      const sel = editor.selection.getSel();
      const range = sel?.getRangeAt(0);
      const savedNode = range?.startContainer;
      const savedOffset: any = range?.startOffset;

      updateTextNodesWithCapitalization(editor);

      // Restore saved selection.
      if (savedNode) {
        const newRange = document.createRange();
        newRange.setStart(savedNode, savedOffset);
        newRange.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange?.(newRange);
      }
    }
  });

  // Prepend custom style tag during content post processing.
  editor.on('PostProcess', (event) => {
    if (event.get) {
      event.content = `${styleTag}\n${event.content}`;
    }
  });
};

/**
 * Handles file picking and image uploading.
 */
const handleFilePicker = (cb: (url: string, meta: { title: string }) => void, _value: string, _meta: any) => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', validImageMimeTypes.join(','));

  input.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];
    if (file) {
      if (!validImageMimeTypes.includes(file.type)) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const editor = editorRef;
        if (editor) {
          const id = `blobid${new Date().getTime()}`;
          const blobCache = editor.editorUpload.blobCache;
          const base64 = (reader.result as string).split(',')[1];
          const blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);
          cb(blobInfo.blobUri(), { title: file.name });
        }
      };
      reader.readAsDataURL(file);
    }
  });
  input.click();
};

let editorRef: any = null; // storing the editor instance

/**
 * Returns class names based on the field type.
 */
const getClassNames = (fieldType?: string) => {
  switch (fieldType) {
    case IFormFieldType.NO_LABEL:
    case IFormFieldType.TOP_LABEL:
      return { labelClassName: '', fieldClassName: 'field p-fluid', divClassName: 'editor-parent' };
    default:
      return {
        labelClassName: 'col-12 mb-3 md:col-3 md:mb-0',
        fieldClassName: 'field grid',
        divClassName: 'col-12 md:col-9 relative editor-parent',
      };
  }
};

export const TinymceEditor = (props: ITinymceEditorProps) => {
  const {
    attribute,
    form,
    fieldType,
    autosavePrefix = "",
    autoSaveInterval = "20s",
    autosaveRetention = "20m",
  } = props;
  const { label, rules } = form[attribute];
  const {
    formState: { errors, defaultValues },
    control,
  } = useFormContext();
  const { labelClassName, fieldClassName, divClassName } = getClassNames(fieldType);

  const labelElement =
    fieldType !== IFormFieldType.NO_LABEL && (
      <label htmlFor={attribute} className={labelClassName}>
        {label} {rules.required && "*"}
      </label>
    );

  const plugins = ["advlist",
    "autolink",
    autosavePrefix ? "autosave" : '',
    "charmap",
    "codesample",
    "directionality",
    "emoticons",
    "fullscreen",
    "help",
    "image",
    "insertdatetime",
    "link",
    "lists",
    "nonbreaking",
    "preview",
    "searchreplace",
    "table",
    "wordcount",].filter(Boolean)

  // Define the editor's initialization configuration.
  const editorInitConfig = {
    menubar: true,
    plugins: plugins,
    toolbar:
      "drafts restoredraft undo redo | fontfamily styles fontsizeinput lineheight | forecolor backcolor removeformat | bold italic underline strikethrough | formatselect fontselect fontsizeselect | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | charmap emoticons | fullscreen preview print | image link codesample | ltr rtl | table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter | tabledeleterow | tableinsertcolbefore tableinsertcolafter | tabledeletecol | searchreplace | help",
    toolbar_sticky: true,
    elementpath: false,
    visual: false,
    link_target_list: false,
    images_file_types: validImageTypes.join(","),
    content_style: contentStyle,
    file_picker_types: "image",
    automatic_uploads: true,
    file_picker_callback: handleFilePicker,
    image_title: true,
    object_resizing: "img",
    browser_spellcheck: true,
    autosave_prefix: autosavePrefix ? `tinymce-draft-${autosavePrefix}-${Number(getAllDrafts(autosavePrefix, autosaveRetention)[0]?.id || 0) + 1}` : null,
    autosave_interval: autoSaveInterval,
    autosave_retention: autosaveRetention,
    autosave_ask_before_unload: false,
    setup: (editor: IEditor) => {
      editorRef = editor;
      setupCustomToolbar(editor, autosavePrefix);
    },
  };

  return (
    <div className={fieldClassName}>
      {labelElement}
      <div className={divClassName}>
        <Controller
          name={attribute}
          control={control}
          rules={inputValidator(rules, label)}
          defaultValue={defaultValues?.[attribute] ?? ""}
          render={({ field }) => (
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              value={field.value}
              init={editorInitConfig}
              onEditorChange={(content) => field.onChange(content)}
            />
          )}
        />
        <FormFieldError data={{ errors, name: attribute }} />
      </div>
    </div>
  );
};
