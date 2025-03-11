import { useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import { IFormProps } from "../formInterface/forms.model";
import { inputValidator } from "../../../../library/utilities/helperFunction";
import { IFormFieldType } from "../../../../library/utilities/constant";
import { FormFieldError } from "../formFieldError/FormFieldError";

const validImageTypes = ["jpeg", "png", "jpg", "gif"];

export const TinymceEditor = (props: IFormProps) => {
  const editorRef = useRef(null) as any;
  const { attribute, form, fieldType } = props;
  const { label } = form[attribute];
  const { required } = form[attribute].rules;
  const {
    formState: { errors, defaultValues },
    control,
  } = useFormContext();

  const validAccess = validImageTypes.map((type) => `image/${type}`);
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

  const handleFilePicker = (
    cb: (url: string, meta: { title: string }) => void,
    _value: string,
    _meta: any
  ) => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", validAccess.join(","));

    input.addEventListener("change", (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (file) {
        if (!validAccess.includes(file.type)) {
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const editor = editorRef.current;
          if (editor) {
            const id = `blobid${new Date().getTime()}`;
            const blobCache = editor.editorUpload.blobCache;
            const base64 = (reader.result as string).split(",")[1];
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

  const getClassNames = () => {
    let labelClassName = "";
    let fieldClassName = "";
    let divClassName = "";
    switch (fieldType) {
      case IFormFieldType.NO_LABEL:
      case IFormFieldType.TOP_LABEL:
        fieldClassName = "field p-fluid";
        divClassName = "editor-parent";
        break;
      default:
        labelClassName = "col-12 mb-3 md:col-3 md:mb-0";
        fieldClassName = "field grid";
        divClassName = "col-12 md:col-9 relative editor-parent";
        break;
    }
    return { labelClassName, fieldClassName, divClassName };
  };

  const { labelClassName, fieldClassName, divClassName } = getClassNames();
  const labelElement = (
    <label htmlFor={attribute} className={labelClassName}>
      {label} {required && "*"}
    </label>
  );

  return (
    <div className={fieldClassName}>
      {fieldType !== IFormFieldType.NO_LABEL && labelElement}
      <div className={divClassName}>
        <Controller
          name={attribute}
          control={control}
          rules={inputValidator(form[attribute].rules, label)}
          defaultValue={defaultValues?.[attribute] ?? ""}
          render={({ field }) => (
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              onInit={(_evt, editor) => {
                editorRef.current = editor;
              }}
              value={field.value}
              init={{
                menubar: true,
                plugins: [
                  "advlist",
                  "autolink",
                  "autosave",
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
                  "wordcount",
                ],
                toolbar:
                  "undo redo | fontfamily styles fontsizeinput lineheight | forecolor backcolor removeformat | bold italic underline strikethrough | formatselect fontselect fontsizeselect | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | charmap emoticons | fullscreen preview print | image link codesample | ltr rtl | table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter | tabledeleterow | tableinsertcolbefore tableinsertcolafter | tabledeletecol | searchreplace | help",
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
                setup: (editor) => {
                  // Handle Tab key for inserting spaces (4 non-breaking spaces "    ")
                  editor.on("keydown", function (event) {
                    if (event.key === "Tab") {
                      event.preventDefault();
                      editor.execCommand("mceInsertContent", false, "    ");
                    }
                  });

                  // Capitalize first letter of each sentence
                  editor.on("keyup", function (event) {
                    if (event.key === " " || event.key === "Enter") {
                      // Save the current selection details
                      const sel: any = editor.selection.getSel();
                      const range = sel?.getRangeAt(0);
                      const savedNode = range?.startContainer;
                      const savedOffset: any = range?.startOffset;

                      const body = editor.getBody();
                      const walker = document.createTreeWalker(
                        body,
                        NodeFilter.SHOW_TEXT
                      );
                      let node;
                      while ((node = walker.nextNode())) {
                        const text = node.nodeValue;
                        if (!text) continue;

                        // Split text into sentences based on punctuation and whitespace
                        const sentences = text.split(/([.!?]\s+)/g);
                        const capitalizedSentences = sentences.map(
                          (sentence, index) => {
                            // Capitalize if at the start or if the previous token ends with punctuation+whitespace.
                            if (
                              index === 0 ||
                              /[.!?]\s+$/.test(sentences[index - 1])
                            ) {
                              return (
                                sentence.charAt(0).toUpperCase() +
                                sentence.slice(1)
                              );
                            }
                            return sentence;
                          }
                        );
                        const newText = capitalizedSentences.join("");
                        if (text !== newText) {
                          node.nodeValue = newText;
                        }
                      }

                      // Restore the saved selection to keep focus and caret position.
                      if (savedNode) {
                        const newRange = document.createRange();
                        newRange.setStart(savedNode, savedOffset);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                      }
                    }
                  });

                  editor.on("PostProcess", function (event) {
                    if (event.get) {
                      // Prepend the new style tag
                      event.content = `${styleTag}\n${event.content}`;
                    }
                  });
                },
              }}
              onEditorChange={(content) => {
                field.onChange(content);
              }}
            />
          )}
        />
        <FormFieldError data={{ errors, name: attribute }} />
      </div>
    </div>
  );
};
