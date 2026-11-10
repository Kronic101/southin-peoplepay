const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:4000/api';

async function jsonRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type':
          'application/json',
        ...(options.headers ||
          {}),
      },
      cache:
        'no-store',
    },
  );

  let body: any =
    null;

  try {
    body =
      await response.json();
  } catch {
    body =
      null;
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  return body as T;
}

export type DocumentAttachmentRecord = {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  category: string;
  title?: string | null;
  notes?: string | null;
  originalFileName: string;
  mimeType: string;
  fileSize?: number | null;
  storageProvider: string;
  storageBucket: string;
  storagePath: string;
  uploadedBy?: string | null;
  uploadedByEmail?: string | null;
  uploadedByEntraId?: string | null;
  uploadedAt: string;
  documentDate?: string | null;
  expiresAt?: string | null;
  status: string;
  isConfidential: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listDocuments(input: {
  module?: string;
  entityType?: string;
  entityId?: string;
  category?: string;
}) {
  const params =
    new URLSearchParams();

  if (input.module) {
    params.set(
      'module',
      input.module,
    );
  }

  if (
    input.entityType
  ) {
    params.set(
      'entityType',
      input.entityType,
    );
  }

  if (input.entityId) {
    params.set(
      'entityId',
      input.entityId,
    );
  }

  if (input.category) {
    params.set(
      'category',
      input.category,
    );
  }

  return jsonRequest<
    DocumentAttachmentRecord[]
  >(
    `/documents?${params.toString()}`,
  );
}

export async function uploadDocument(input: {
  file: File;

  module: string;
  entityType: string;
  entityId: string;
  category: string;

  title?: string;
  notes?: string;

  uploadedBy?: string;
  uploadedByEmail?: string;
  uploadedByEntraId?: string;

  isConfidential?: boolean;
}) {
  const form =
    new FormData();

  form.append(
    'file',
    input.file,
  );

  form.append(
    'module',
    input.module,
  );

  form.append(
    'entityType',
    input.entityType,
  );

  form.append(
    'entityId',
    input.entityId,
  );

  form.append(
    'category',
    input.category,
  );

  if (input.title) {
    form.append(
      'title',
      input.title,
    );
  }

  if (input.notes) {
    form.append(
      'notes',
      input.notes,
    );
  }

  if (input.uploadedBy) {
    form.append(
      'uploadedBy',
      input.uploadedBy,
    );
  }

  if (
    input.uploadedByEmail
  ) {
    form.append(
      'uploadedByEmail',
      input.uploadedByEmail,
    );
  }

  if (
    input.uploadedByEntraId
  ) {
    form.append(
      'uploadedByEntraId',
      input.uploadedByEntraId,
    );
  }

  form.append(
    'isConfidential',
    String(
      Boolean(
        input.isConfidential,
      ),
    ),
  );

  const response =
    await fetch(
      `${API_BASE_URL}/documents/upload`,
      {
        method:
          'POST',

        body:
          form,

        cache:
          'no-store',
      },
    );

  let body: any =
    null;

  try {
    body =
      await response.json();
  } catch {
    body =
      null;
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Document upload failed with status ${response.status}`,
    );
  }

  return body as DocumentAttachmentRecord;
}

export function getDocumentSignedUrl(
  id: string,
) {
  return jsonRequest<{
    document: DocumentAttachmentRecord;
    url: string;
    expiresIn: number;
  }>(
    `/documents/${id}/signed-url`,
  );
}
