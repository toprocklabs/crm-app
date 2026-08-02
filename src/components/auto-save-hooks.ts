"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Shared machinery behind the ten `auto-save-*` components.
//
// Reading all ten (see planning/004-architecture-hardening, F08) they turn out
// to be THREE interaction families, not one pattern that drifted:
//
//   A. click-to-edit with optimistic display  — company field, proposal PIN
//   B. always-visible input, save on blur     — contact, deal, activity date
//   C. select, save on change + router.refresh — the five dropdowns
//
// A and B are deliberately different UIs, so they are not merged; collapsing
// contact/deal into click-to-edit would redesign four pages. What was actually
// duplicated is the submit machinery — most egregiously in family C, where the
// same twelve lines appeared five times. That is what lives here. Each
// component keeps its own markup, so this refactor is invisible.

type ServerAction = (formData: FormData) => void | Promise<void>;

/** Blur the input on Enter so the existing blur handler does the saving. */
export function blurOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

/**
 * Family B — an always-visible input that submits its form on blur, but only
 * when the value actually changed. Progressive-enhancement friendly: the
 * <form action={...}> does the work, we just call requestSubmit().
 */
export function useAutoSaveInput(defaultValue: string) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);

  function submitIfChanged() {
    const current = inputRef.current?.value ?? "";

    if (current === lastSubmittedValueRef.current) {
      return;
    }

    lastSubmittedValueRef.current = current;
    formRef.current?.requestSubmit();
  }

  /** For inputs that save on change (a date picker) rather than on blur. */
  function submitValueIfChanged(current: string) {
    if (current === lastSubmittedValueRef.current) {
      return;
    }

    lastSubmittedValueRef.current = current;
    formRef.current?.requestSubmit();
  }

  return { formRef, inputRef, submitIfChanged, submitValueIfChanged };
}

/**
 * Family A — click a button to reveal an input, Escape to cancel, blur/Enter to
 * save. Holds an optimistic `displayValue` so the new text appears immediately
 * rather than after the server round-trip.
 *
 * `normalize` runs on the raw input before the dirty-check; returning null
 * rejects the edit and reverts (the PIN field uses this to refuse anything
 * that isn't 3-6 digits).
 */
export function useAutoSaveEditable(
  defaultValue: string,
  normalize: (raw: string) => string | null = (raw) => raw,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const [displayValue, setDisplayValue] = useState(defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(defaultValue);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function beginEditing() {
    setDraftValue(lastSubmittedValueRef.current);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftValue(lastSubmittedValueRef.current);
    setIsEditing(false);
  }

  function submitIfChanged() {
    const current = normalize(inputRef.current?.value ?? "");
    setIsEditing(false);

    if (current === null || current === lastSubmittedValueRef.current) {
      setDraftValue(lastSubmittedValueRef.current);
      return;
    }

    lastSubmittedValueRef.current = current;
    setDisplayValue(current);
    formRef.current?.requestSubmit();
  }

  function onEditKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  return {
    formRef,
    inputRef,
    displayValue,
    draftValue,
    setDraftValue,
    isEditing,
    beginEditing,
    cancelEditing,
    submitIfChanged,
    onEditKeyDown,
  };
}

/**
 * Family C — a <select> that saves on change. Calls the action directly inside
 * a transition and then router.refresh(), rather than requestSubmit(), so the
 * surrounding page re-renders with the new value without a navigation.
 *
 * `pending` is exposed for the callers that disable the control mid-flight.
 */
export function useAutoSaveSelect(defaultValue: string, action: ServerAction) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();

  function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const current = event.currentTarget.value;
    setSelectedValue(current);

    if (current === lastSubmittedValueRef.current) {
      return;
    }

    lastSubmittedValueRef.current = current;

    startTransition(() => {
      const formData = new FormData(formRef.current ?? undefined);

      void Promise.resolve(action(formData)).then(() => {
        router.refresh();
      });
    });
  }

  return { formRef, selectedValue, pending, onSelectChange };
}
