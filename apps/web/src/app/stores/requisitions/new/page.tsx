'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';

import {
  getStockBalances,
  getStockItems,
  StockBalance,
  StockItem,
} from '@/lib/assets-api';

import { createStoresRequisition } from '@/lib/stores-api';

type InventoryControlType =
  | 'CONSUMABLE'
  | 'NON_CONSUMABLE';

type ExtendedStockItem =
  StockItem & {
    inventoryControlType?:
      | InventoryControlType
      | null;

    assetRegistrationRequired?:
      | boolean
      | null;

    custodyTrackingRequired?:
      | boolean
      | null;
  };

type ExtendedStockBalance =
  StockBalance & {
    stockItem?:
      | ExtendedStockItem
      | null;
  };

type LineForm = {
  stockItemId: string;
  quantity: string;
  notes: string;
};

const emptyLine: LineForm = {
  stockItemId: '',
  quantity: '1',
  notes: '',
};

function asNumber(
  value: unknown,
) {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function money(
  value: unknown,
) {
  return `K ${asNumber(
    value,
  ).toLocaleString(
    'en-ZM',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function controlLabel(
  value: InventoryControlType,
) {
  return value ===
    'NON_CONSUMABLE'
    ? 'Non-Consumable'
    : 'Consumable';
}

function availabilityLabel(
  requested: number,
  available: number,
) {
  if (
    available <= 0
  ) {
    return 'OUT OF STOCK';
  }

  if (
    available <
    requested
  ) {
    return 'PARTIALLY AVAILABLE';
  }

  return 'IN STOCK';
}

function availabilityClass(
  requested: number,
  available: number,
) {
  if (
    available <= 0 ||
    available <
      requested
  ) {
    return 'status-pill warning';
  }

  return 'status-pill success';
}

export default function NewStoresRequisitionPage() {
  const router =
    useRouter();

  const [
    requestControlType,
    setRequestControlType,
  ] =
    useState<
      InventoryControlType | ''
    >('');

  const [
    requestedBy,
    setRequestedBy,
  ] =
    useState('');

  const [
    requestedByEmail,
    setRequestedByEmail,
  ] =
    useState('');

  const [
    department,
    setDepartment,
  ] =
    useState('');

  const [
    site,
    setSite,
  ] =
    useState('');

  const [
    branch,
    setBranch,
  ] =
    useState('');

  const [
    projectCode,
    setProjectCode,
  ] =
    useState('');

  const [
    reason,
    setReason,
  ] =
    useState('');

  const [
    items,
    setItems,
  ] =
    useState<
      ExtendedStockItem[]
    >([]);

  const [
    balances,
    setBalances,
  ] =
    useState<
      ExtendedStockBalance[]
    >([]);

  const [
    lines,
    setLines,
  ] =
    useState<
      LineForm[]
    >([
      {
        ...emptyLine,
      },
    ]);

  const [
    catalogueSearch,
    setCatalogueSearch,
  ] =
    useState('');

  const [
    loadingCatalogue,
    setLoadingCatalogue,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(
    () => {
      loadCatalogue();
      loadRequesterSession();
    },
    [],
  );

  async function loadCatalogue() {
    setLoadingCatalogue(
      true,
    );

    setError('');

    try {
      const [
        stockResult,
        balanceResult,
      ] =
        await Promise.all([
          getStockItems(),
          getStockBalances(),
        ]);

      setItems(
        Array.isArray(
          stockResult,
        )
          ? stockResult as
              ExtendedStockItem[]
          : [],
      );

      setBalances(
        Array.isArray(
          balanceResult,
        )
          ? balanceResult as
              ExtendedStockBalance[]
          : [],
      );
    } catch (
      err: any
    ) {
      setItems([]);
      setBalances([]);

      setError(
        err?.message ||
          'Unable to load the Stores catalogue.',
      );
    } finally {
      setLoadingCatalogue(
        false,
      );
    }
  }

  async function loadRequesterSession() {
    try {
      const response =
        await fetch(
          '/api/auth/session',
          {
            cache:
              'no-store',
          },
        );

      if (
        !response.ok
      ) {
        return;
      }

      const session =
        await response.json();

      const user =
        session?.user ||
        {};

      const name =
        String(
          user.name ||
            user.displayName ||
            user.fullName ||
            '',
        ).trim();

      const email =
        String(
          user.email ||
            '',
        ).trim();

      const sessionDepartment =
        String(
          user.department ||
            user.departmentName ||
            '',
        ).trim();

      const sessionSite =
        String(
          user.site ||
            user.siteName ||
            '',
        ).trim();

      const sessionBranch =
        String(
          user.branch ||
            '',
        ).trim();

      if (name) {
        setRequestedBy(
          name,
        );
      }

      if (email) {
        setRequestedByEmail(
          email,
        );
      }

      if (
        sessionDepartment
      ) {
        setDepartment(
          sessionDepartment,
        );
      }

      if (
        sessionSite
      ) {
        setSite(
          sessionSite,
        );
      }

      if (
        sessionBranch
      ) {
        setBranch(
          sessionBranch,
        );
      }
    } catch {
      // Session prefill is optional.
    }
  }

  const activeItems =
    useMemo(
      () =>
        items.filter(
          (
            item,
          ) =>
            item.isActive !==
            false,
        ),
      [items],
    );

  const filteredCatalogue =
    useMemo(
      () => {
        if (
          !requestControlType
        ) {
          return [];
        }

        const needle =
          catalogueSearch
            .trim()
            .toLowerCase();

        return activeItems
          .filter(
            (
              item,
            ) => {
              const control =
                String(
                  item.inventoryControlType ||
                    'CONSUMABLE',
                )
                  .trim()
                  .toUpperCase();

              return (
                control ===
                requestControlType
              );
            },
          )
          .filter(
            (
              item,
            ) => {
              if (
                !needle
              ) {
                return true;
              }

              return [
                item.itemCode,
                item.itemName,
                item.itemType,
                item.category,
              ]
                .map(
                  (
                    value,
                  ) =>
                    String(
                      value ||
                        '',
                    ).toLowerCase(),
                )
                .some(
                  (
                    value,
                  ) =>
                    value.includes(
                      needle,
                    ),
                );
            },
          )
          .sort(
            (
              a,
              b,
            ) =>
              String(
                a.itemName ||
                  '',
              ).localeCompare(
                String(
                  b.itemName ||
                    '',
                ),
              ),
          );
      },
      [
        activeItems,
        requestControlType,
        catalogueSearch,
      ],
    );

  const itemMap =
    useMemo(
      () =>
        new Map(
          items.map(
            (
              item,
            ) => [
              item.id,
              item,
            ],
          ),
        ),
      [items],
    );

  const balanceMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              totalOnHand:
                number;

              locations:
                Array<{
                  locationCode:
                    string;

                  locationName:
                    string;

                  site:
                    string;

                  quantityOnHand:
                    number;
                }>;
            }
          >();

        for (
          const balance
          of balances
        ) {
          const current =
            map.get(
              balance.stockItemId,
            ) || {
              totalOnHand:
                0,

              locations:
                [],
            };

          const quantity =
            asNumber(
              balance.quantityOnHand,
            );

          const location:
            any =
              balance.location ||
              {};

          current.totalOnHand +=
            quantity;

          current.locations.push(
            {
              locationCode:
                String(
                  location.locationCode ||
                    '',
                ),

              locationName:
                String(
                  location.locationName ||
                    '',
                ),

              site:
                String(
                  location.site ||
                    '',
                ),

              quantityOnHand:
                quantity,
            },
          );

          map.set(
            balance.stockItemId,
            current,
          );
        }

        return map;
      },
      [balances],
    );

  const totalValue =
    useMemo(
      () => {
        return lines.reduce(
          (
            sum,
            line,
          ) => {
            const item =
              itemMap.get(
                line.stockItemId,
              );

            return (
              sum +
              asNumber(
                line.quantity,
              ) *
                asNumber(
                  item?.standardCost,
                )
            );
          },
          0,
        );
      },
      [
        lines,
        itemMap,
      ],
    );

  const selectedLineCount =
    useMemo(
      () =>
        lines.filter(
          (
            line,
          ) =>
            line.stockItemId,
        ).length,
      [lines],
    );

  function setControlType(
    value:
      InventoryControlType,
  ) {
    if (
      requestControlType ===
      value
    ) {
      return;
    }

    const hasItems =
      lines.some(
        (
          line,
        ) =>
          line.stockItemId,
      );

    setRequestControlType(
      value,
    );

    setCatalogueSearch(
      '',
    );

    if (
      hasItems
    ) {
      setLines([
        {
          ...emptyLine,
        },
      ]);

      setMessage(
        `Request changed to ${controlLabel(
          value,
        )}. Existing lines were cleared to prevent mixed stock types.`,
      );
    }
  }

  function updateLine(
    index: number,
    key: keyof LineForm,
    value: string,
  ) {
    setLines(
      (
        current,
      ) =>
        current.map(
          (
            line,
            lineIndex,
          ) =>
            lineIndex ===
            index
              ? {
                  ...line,
                  [key]:
                    value,
                }
              : line,
        ),
    );
  }

  function selectItem(
    index: number,
    stockItemId: string,
  ) {
    if (
      !stockItemId
    ) {
      updateLine(
        index,
        'stockItemId',
        '',
      );

      return;
    }

    const item =
      itemMap.get(
        stockItemId,
      );

    if (!item) {
      setError(
        'Selected stock item was not found. Refresh the catalogue.',
      );

      return;
    }

    if (
      !requestControlType
    ) {
      setError(
        'Choose Consumable or Non-Consumable before selecting stock.',
      );

      return;
    }

    const itemControl =
      String(
        item.inventoryControlType ||
          'CONSUMABLE',
      )
        .trim()
        .toUpperCase();

    if (
      itemControl !==
      requestControlType
    ) {
      setError(
        'Consumable and non-consumable stock cannot be raised on the same Stores Requisition.',
      );

      return;
    }

    setError('');

    updateLine(
      index,
      'stockItemId',
      stockItemId,
    );
  }

  function addLine() {
    if (
      !requestControlType
    ) {
      setError(
        'Choose the request stock type before adding lines.',
      );

      return;
    }

    setLines(
      (
        current,
      ) => [
        ...current,
        {
          ...emptyLine,
        },
      ],
    );
  }

  function removeLine(
    index: number,
  ) {
    setLines(
      (
        current,
      ) => {
        if (
          current.length ===
          1
        ) {
          return [
            {
              ...emptyLine,
            },
          ];
        }

        return current.filter(
          (
            _,
            lineIndex,
          ) =>
            lineIndex !==
            index,
        );
      },
    );
  }

  function validateControlType() {
    if (
      !requestControlType
    ) {
      throw new Error(
        'Choose Consumable or Non-Consumable for this request.',
      );
    }

    for (
      const line
      of lines
    ) {
      if (
        !line.stockItemId
      ) {
        continue;
      }

      const item =
        itemMap.get(
          line.stockItemId,
        );

      if (!item) {
        throw new Error(
          'One of the selected stock items no longer exists.',
        );
      }

      const itemControl =
        String(
          item.inventoryControlType ||
            'CONSUMABLE',
        )
          .trim()
          .toUpperCase();

      if (
        itemControl !==
        requestControlType
      ) {
        throw new Error(
          'Consumable and non-consumable stock cannot be raised on the same Stores Requisition.',
        );
      }
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      validateControlType();

      const selectedControlType = requestControlType;

      if (!selectedControlType) {
        throw new Error(
          'Choose Consumable or Non-Consumable for this request.',
        );
      }

      if (
        !requestedBy.trim()
      ) {
        throw new Error(
          'Requested By is required.',
        );
      }

      if (
        !department.trim()
      ) {
        throw new Error(
          'Department is required.',
        );
      }

      if (
        !site.trim()
      ) {
        throw new Error(
          'Site is required.',
        );
      }

      if (
        !reason.trim()
      ) {
        throw new Error(
          'Reason is required.',
        );
      }

      const cleanLines =
        lines
          .filter(
            (
              line,
            ) =>
              line.stockItemId,
          )
          .map(
            (
              line,
            ) => {
              const item =
                itemMap.get(
                  line.stockItemId,
                );

              if (!item) {
                throw new Error(
                  'A selected stock item could not be found.',
                );
              }

              const quantity =
                asNumber(
                  line.quantity,
                );

              if (
                quantity <=
                0
              ) {
                throw new Error(
                  `Requested quantity for ${item.itemName} must be greater than zero.`,
                );
              }

              return {
                stockItemId:
                  item.id,

                itemCode:
                  item.itemCode ||
                  null,

                itemName:
                  item.itemName,

                description:
                  item.description ||
                  null,

                quantity,

                unitCost:
                  asNumber(
                    item.standardCost,
                  ),

                unitOfMeasure:
                  item.unitOfMeasure ||
                  'EA',

                notes:
                  line.notes.trim() ||
                  null,
              };
            },
          );

      if (
        !cleanLines.length
      ) {
        throw new Error(
          'Select at least one catalogue item.',
        );
      }

      const duplicateIds =
        cleanLines
          .map(
            (
              line,
            ) =>
              line.stockItemId,
          )
          .filter(
            (
              id,
              index,
              array,
            ) =>
              array.indexOf(
                id,
              ) !==
              index,
          );

      if (
        duplicateIds.length >
        0
      ) {
        throw new Error(
          'The same stock item has been added more than once. Combine it into one requisition line.',
        );
      }

      const result =
        await createStoresRequisition(
          {
            requestedBy:
              requestedBy.trim(),

            requestedByEmail:
              requestedByEmail.trim() ||
              null,

            department:
              department.trim(),

            site:
              site.trim(),

            branch:
              branch.trim() ||
              null,

            projectCode:
              projectCode.trim() ||
              null,

            reason:
              reason.trim(),

            description:
              `${controlLabel(
                selectedControlType,
              )} Stores Requisition. ` +
              'Stock availability displayed at request time is provisional and subject to Stores confirmation.',

            lines:
              cleanLines,
          },
        );

      setMessage(
        `Requisition ${result.requisition.requisitionNo} submitted successfully.`,
      );

      router.push(
        `/stores/requisitions/${result.requisition.id}`,
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to submit stores requisition.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <AppShell>
      <RequireStaffRole
        allowedRoles={[
          'ADMIN',
          'DIRECTOR',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
          'ASSET_MANAGER',
          'ASSET_OFFICER',
          'LINE_MANAGER',
          'SUPERVISOR',
        ]}
      >
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">
                Stores Management
              </p>

              <h1>
                New Stores Requisition
              </h1>

              <p className="muted">
                Choose one stock control class,
                select actual catalogue items,
                review current availability and
                submit the request for approval.
              </p>
            </div>

            <div className="action-row">
              <button
                className="btn-secondary"
                type="button"
                onClick={
                  loadCatalogue
                }
                disabled={
                  loadingCatalogue
                }
              >
                {loadingCatalogue
                  ? 'Refreshing...'
                  : 'Refresh Stock'}
              </button>

              <Link
                className="btn-secondary"
                href="/stores/requisitions"
              >
                Back to Requisitions
              </Link>
            </div>
          </div>

          <div className="finance-notice warning">
            <strong>
              PROVISIONAL OPENING STOCK — PHYSICAL STOCKTAKE PENDING.
            </strong>{' '}
            Current availability may be used
            for controlled production testing.
            The new physical count will later
            reconcile these balances through
            Stock Count adjustments.
          </div>

          {message ? (
            <div className="alert success">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="alert error">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={
              handleSubmit
            }
          >
            <div className="finance-card">
              <h2>
                1. Choose Request Type
              </h2>

              <p className="muted">
                Consumable and non-consumable
                items cannot be raised on the
                same Stores Requisition.
              </p>

              <div className="finance-summary-grid">
                <button
                  className="finance-summary-card"
                  type="button"
                  onClick={() =>
                    setControlType(
                      'CONSUMABLE',
                    )
                  }
                  style={{
                    cursor:
                      'pointer',

                    textAlign:
                      'left',

                    border:
                      requestControlType ===
                      'CONSUMABLE'
                        ? '2px solid currentColor'
                        : undefined,
                  }}
                >
                  <span>
                    Consumable Stock
                  </span>

                  <strong>
                    CONSUMABLE
                  </strong>

                  <small>
                    Items consumed through
                    normal operations.
                  </small>
                </button>

                <button
                  className="finance-summary-card"
                  type="button"
                  onClick={() =>
                    setControlType(
                      'NON_CONSUMABLE',
                    )
                  }
                  style={{
                    cursor:
                      'pointer',

                    textAlign:
                      'left',

                    border:
                      requestControlType ===
                      'NON_CONSUMABLE'
                        ? '2px solid currentColor'
                        : undefined,
                  }}
                >
                  <span>
                    Non-Consumable Stock
                  </span>

                  <strong>
                    NON-CONSUMABLE
                  </strong>

                  <small>
                    Reusable or accountable
                    tools and equipment.
                  </small>
                </button>
              </div>
            </div>

            <div className="finance-card">
              <h2>
                2. Requester Details
              </h2>

              <div className="form-grid">
                <label>
                  Requested By

                  <input
                    value={
                      requestedBy
                    }
                    onChange={(
                      event,
                    ) =>
                      setRequestedBy(
                        event.target.value,
                      )
                    }
                    placeholder="Requester name"
                    required
                  />
                </label>

                <label>
                  Requester Email

                  <input
                    type="email"
                    value={
                      requestedByEmail
                    }
                    onChange={(
                      event,
                    ) =>
                      setRequestedByEmail(
                        event.target.value,
                      )
                    }
                    placeholder="name@southincon.com"
                  />
                </label>

                <label>
                  Department

                  <input
                    value={
                      department
                    }
                    onChange={(
                      event,
                    ) =>
                      setDepartment(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Site

                  <input
                    value={site}
                    onChange={(
                      event,
                    ) =>
                      setSite(
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Branch

                  <input
                    value={
                      branch
                    }
                    onChange={(
                      event,
                    ) =>
                      setBranch(
                        event.target.value,
                      )
                    }
                    placeholder="Optional"
                  />
                </label>

                <label>
                  Project Code

                  <input
                    value={
                      projectCode
                    }
                    onChange={(
                      event,
                    ) =>
                      setProjectCode(
                        event.target.value,
                      )
                    }
                    placeholder="Optional"
                  />
                </label>

                <label
                  style={{
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  Reason

                  <textarea
                    value={reason}
                    onChange={(
                      event,
                    ) =>
                      setReason(
                        event.target.value,
                      )
                    }
                    placeholder="Explain why the stock is required and where it will be used."
                    required
                  />
                </label>
              </div>
            </div>

            <div className="finance-card">
              <div className="section-title-row">
                <div>
                  <h2>
                    3. Select Stock
                  </h2>

                  <p className="muted">
                    Catalogue items are filtered
                    by the request type selected
                    above.
                  </p>
                </div>

                <button
                  className="btn-secondary"
                  type="button"
                  onClick={addLine}
                  disabled={
                    !requestControlType
                  }
                >
                  Add Line
                </button>
              </div>

              {!requestControlType ? (
                <div className="finance-notice warning">
                  Choose Consumable or
                  Non-Consumable before selecting
                  stock.
                </div>
              ) : (
                <div
                  className="form-grid"
                  style={{
                    marginBottom:
                      '1rem',
                  }}
                >
                  <label
                    style={{
                      gridColumn:
                        '1 / -1',
                    }}
                  >
                    Search Catalogue

                    <input
                      value={
                        catalogueSearch
                      }
                      onChange={(
                        event,
                      ) =>
                        setCatalogueSearch(
                          event.target.value,
                        )
                      }
                      placeholder={`Search ${controlLabel(
                        requestControlType,
                      )} stock`}
                    />
                  </label>
                </div>
              )}

              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>
                        Catalogue Item
                      </th>

                      <th>
                        Type / Control
                      </th>

                      <th>
                        Available
                      </th>

                      <th>
                        Requested
                      </th>

                      <th>
                        UOM
                      </th>

                      <th>
                        Est. Cost
                      </th>

                      <th>
                        Availability
                      </th>

                      <th>
                        Controls
                      </th>

                      <th>
                        Notes
                      </th>

                      <th>
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {lines.map(
                      (
                        line,
                        index,
                      ) => {
                        const item =
                          itemMap.get(
                            line.stockItemId,
                          );

                        const balance =
                          line.stockItemId
                            ? balanceMap.get(
                                line.stockItemId,
                              )
                            : undefined;

                        const requested =
                          asNumber(
                            line.quantity,
                          );

                        const available =
                          balance
                            ?.totalOnHand ||
                          0;

                        const lineValue =
                          requested *
                          asNumber(
                            item?.standardCost,
                          );

                        const selectedVisible =
                          item
                            ? filteredCatalogue.some(
                                (
                                  option,
                                ) =>
                                  option.id ===
                                  item.id,
                              )
                            : false;

                        return (
                          <tr
                            key={`line-${index}`}
                          >
                            <td>
                              <select
                                value={
                                  line.stockItemId
                                }
                                onChange={(
                                  event,
                                ) =>
                                  selectItem(
                                    index,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                disabled={
                                  !requestControlType
                                }
                                required
                              >
                                <option value="">
                                  Select stock item
                                </option>

                                {item &&
                                !selectedVisible ? (
                                  <option
                                    value={
                                      item.id
                                    }
                                  >
                                    {
                                      item.itemCode
                                    }{' '}
                                    -{' '}
                                    {
                                      item.itemName
                                    }
                                  </option>
                                ) : null}

                                {filteredCatalogue.map(
                                  (
                                    option,
                                  ) => (
                                    <option
                                      key={
                                        option.id
                                      }
                                      value={
                                        option.id
                                      }
                                    >
                                      {
                                        option.itemCode
                                      }{' '}
                                      -{' '}
                                      {
                                        option.itemName
                                      }
                                    </option>
                                  ),
                                )}
                              </select>

                              {item ? (
                                <div className="muted">
                                  {item.category ||
                                    item.itemType ||
                                    '-'}
                                </div>
                              ) : null}
                            </td>

                            <td>
                              {item ? (
                                <>
                                  <div>
                                    {
                                      item.itemType
                                    }
                                  </div>

                                  <span className="status-pill">
                                    {controlLabel(
                                      (item.inventoryControlType ||
                                        'CONSUMABLE') as
                                        InventoryControlType,
                                    )}
                                  </span>
                                </>
                              ) : (
                                '-'
                              )}
                            </td>

                            <td>
                              <strong>
                                {
                                  available
                                }
                              </strong>

                              {balance
                                ?.locations
                                ?.length ? (
                                <details>
                                  <summary className="muted">
                                    Locations
                                  </summary>

                                  {balance.locations.map(
                                    (
                                      location,
                                    ) => (
                                      <div
                                        className="muted"
                                        key={
                                          location.locationCode
                                        }
                                      >
                                        {location.locationCode ||
                                          location.locationName ||
                                          'Store'}
                                        :{' '}
                                        {
                                          location.quantityOnHand
                                        }
                                      </div>
                                    ),
                                  )}
                                </details>
                              ) : null}
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                  line.quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateLine(
                                    index,
                                    'quantity',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                required
                              />
                            </td>

                            <td>
                              {item
                                ?.unitOfMeasure ||
                                '-'}
                            </td>

                            <td>
                              {item
                                ? money(
                                    lineValue,
                                  )
                                : '-'}
                            </td>

                            <td>
                              {item ? (
                                <span
                                  className={availabilityClass(
                                    requested,
                                    available,
                                  )}
                                >
                                  {availabilityLabel(
                                    requested,
                                    available,
                                  )}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>

                            <td>
                              {item ? (
                                <div className="muted">
                                  {item.assetRegistrationRequired
                                    ? 'Asset registration'
                                    : 'No asset registration'}

                                  <br />

                                  {item.custodyTrackingRequired
                                    ? 'Custody tracking'
                                    : 'No custody tracking'}

                                  <br />

                                  {item.isSerialized
                                    ? 'Serialized'
                                    : 'Not serialized'}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>

                            <td>
                              <input
                                value={
                                  line.notes
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateLine(
                                    index,
                                    'notes',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Optional"
                              />
                            </td>

                            <td>
                              <button
                                className="btn-secondary"
                                type="button"
                                onClick={() =>
                                  removeLine(
                                    index,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className="finance-summary-grid"
                style={{
                  marginTop:
                    '1rem',
                }}
              >
                <div className="finance-summary-card">
                  <span>
                    Request Type
                  </span>

                  <strong>
                    {requestControlType
                      ? controlLabel(
                          requestControlType,
                        )
                      : 'Not Selected'}
                  </strong>
                </div>

                <div className="finance-summary-card">
                  <span>
                    Selected Lines
                  </span>

                  <strong>
                    {
                      selectedLineCount
                    }
                  </strong>
                </div>

                <div className="finance-summary-card">
                  <span>
                    Estimated Value
                  </span>

                  <strong>
                    {money(
                      totalValue,
                    )}
                  </strong>
                </div>
              </div>

              <div
                className="finance-notice"
                style={{
                  marginTop:
                    '1rem',
                }}
              >
                Availability is advisory at
                requisition time. Stores will
                confirm full, partial or no
                availability before issue. Any
                shortfall can later flow into
                Procurement.
              </div>

              <div className="form-actions">
                <button
                  className="btn"
                  type="submit"
                  disabled={
                    saving ||
                    loadingCatalogue ||
                    !requestControlType ||
                    selectedLineCount ===
                      0
                  }
                >
                  {saving
                    ? 'Submitting...'
                    : 'Submit Requisition'}
                </button>

                <Link
                  className="btn-secondary"
                  href="/stores/requisitions"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </section>
      </RequireStaffRole>
    </AppShell>
  );
}