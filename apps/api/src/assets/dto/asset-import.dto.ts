export class CreateAssetImportPreviewDto {
  sourceType!: string;
  fileName?: string;
  createdBy?: string;
  csvText!: string;
}

export class PostAssetImportBatchDto {
  postedBy?: string;
}