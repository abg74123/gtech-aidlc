/**
 * VAT classification for transactions.
 */
export enum VatType {
  /** Input VAT — purchasing side */
  INPUT = 'INPUT',
  /** Output VAT — sales side */
  OUTPUT = 'OUTPUT',
  /** No VAT applicable */
  NONE = 'NONE',
}
