import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import { IFormProps } from "../formInterface/forms.model";
import { inputValidator } from "../../../../library/utilities/helperFunction";
import { IFormFieldType } from "../../../../library/utilities/constant";
import { FormFieldError } from "../formFieldError/FormFieldError";

export const TinymceEditor = (props: IFormProps) => {
  const editorRef = useRef(null) as any;
  const { attribute, form, fieldType } = props;
  const { label } = form[attribute];
  const { required } = form[attribute].rules;
  const {
    formState: { errors, defaultValues },
    control,
  } = useFormContext();

  const handleFilePicker = (
    cb: (url: string, meta: { title: string }) => void,
    _value: string,
    _meta: any
  ) => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");

    input.addEventListener("change", (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (file) {
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
              onInit={(_evt, editor) => (editorRef.current = editor)}
              value={field.value}
              init={{
                menubar: false,
                plugins: "autolink  emoticons image link  lists",
                toolbar:
                  "undo redo | styles | bold italic forecolor backcolor  | link image emoticons | align bullist numlist | removeformat",
                toolbar_sticky: true,
                elementpath: false,
                visual: false,
                link_target_list: false,
                images_file_types: "jpeg,jpg,png,gif",
                content_style: `body { font-family:Helvetica,Arial,sans-serif; font-size:14px }`,
                file_picker_types: "image",
                automatic_uploads: true,
                file_picker_callback: handleFilePicker,
                image_title: true,
                object_resizing: "img",
              }}
              onEditorChange={field.onChange}
            />
          )}
        />
        <FormFieldError data={{ errors, name: attribute }} />
      </div>
    </div>
  );
};
