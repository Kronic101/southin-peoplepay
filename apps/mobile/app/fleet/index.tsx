import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  FleetVehicleDirectoryRecord,
  getFleetVehicleDirectory,
} from '../../src/api/fleet';

type VehicleFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'UNDER_REPAIR'
  | 'FLEET_READY';

function normalise(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function labelStatus(value: unknown) {
  return String(value || 'UNKNOWN')
    .replace(/_/g, ' ');
}

function extractDescriptionValue(
  description: string | null | undefined,
  label: string,
) {
  if (!description) {
    return '';
  }

  const parts = description
    .split('|')
    .map((part) => part.trim());

  const prefix =
    `${label}:`.toUpperCase();

  const match =
    parts.find((part) =>
      part
        .toUpperCase()
        .startsWith(prefix),
    );

  if (!match) {
    return '';
  }

  return match
    .slice(match.indexOf(':') + 1)
    .trim();
}

function getMakeModel(
  vehicle: FleetVehicleDirectoryRecord,
) {
  const configured = [
    vehicle.make,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (configured) {
    return configured;
  }

  const fromDescription =
    extractDescriptionValue(
      (vehicle as any).description,
      'Make/Model',
    );

  return (
    fromDescription ||
    'Vehicle Asset'
  );
}

function getVehicleYear(
  vehicle: FleetVehicleDirectoryRecord,
) {
  if (vehicle.year) {
    return String(vehicle.year);
  }

  return extractDescriptionValue(
    (vehicle as any).description,
    'Year',
  );
}

function getVehicleSite(
  vehicle: FleetVehicleDirectoryRecord,
) {
  return (
    vehicle.site ||
    vehicle.location ||
    extractDescriptionValue(
      (vehicle as any).description,
      'Location',
    ) ||
    'Site not recorded'
  );
}

export default function FleetVehicleDirectoryPage() {
  const router = useRouter();

  const [
    vehicles,
    setVehicles,
  ] = useState<
    FleetVehicleDirectoryRecord[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] =
    useState<VehicleFilter>('ALL');

  const loadVehicles =
    useCallback(
      async (
        refresh = false,
      ) => {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        try {
          const result =
            await getFleetVehicleDirectory();

          setVehicles(
            Array.isArray(result)
              ? result
              : [],
          );
        } catch (err: any) {
          setError(
            err?.message ||
              'Unable to load vehicle directory.',
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useFocusEffect(
    useCallback(() => {
      void loadVehicles();
    }, [loadVehicles]),
  );

  const summary =
    useMemo(() => {
      const active =
        vehicles.filter(
          (vehicle) =>
            [
              'ACTIVE',
              'AVAILABLE',
              'IN_USE',
              'IN_STORE',
            ].includes(
              normalise(
                vehicle.assetStatus,
              ),
            ),
        ).length;

      const underRepair =
        vehicles.filter(
          (vehicle) =>
            normalise(
              vehicle.assetStatus,
            ) ===
            'UNDER_REPAIR',
        ).length;

      const fleetReady =
        vehicles.filter(
          (vehicle) =>
            vehicle.hasFleetProfile,
        ).length;

      return {
        total:
          vehicles.length,

        active,

        underRepair,

        fleetReady,
      };
    }, [vehicles]);

  const filteredVehicles =
    useMemo(() => {
      const term =
        search
          .trim()
          .toUpperCase();

      return vehicles.filter(
        (vehicle) => {
          const assetStatus =
            normalise(
              vehicle.assetStatus,
            );

          if (
            filter === 'ACTIVE' &&
            ![
              'ACTIVE',
              'AVAILABLE',
              'IN_USE',
              'IN_STORE',
            ].includes(assetStatus)
          ) {
            return false;
          }

          if (
            filter ===
              'UNDER_REPAIR' &&
            assetStatus !==
              'UNDER_REPAIR'
          ) {
            return false;
          }

          if (
            filter ===
              'FLEET_READY' &&
            !vehicle.hasFleetProfile
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          const searchable = [
            vehicle.registrationNo,
            vehicle.assetNo,
            vehicle.assetTag,
            vehicle.name,
            vehicle.make,
            vehicle.model,
            vehicle.serialNumber,
            vehicle.department,
            vehicle.site,
            vehicle.location,
            (vehicle as any)
              .description,
          ]
            .filter(Boolean)
            .join(' ')
            .toUpperCase();

          return searchable.includes(
            term,
          );
        },
      );
    }, [
      vehicles,
      search,
      filter,
    ]);

  function renderVehicle({
    item: vehicle,
  }: {
    item: FleetVehicleDirectoryRecord;
  }) {
    const makeModel =
      getMakeModel(vehicle);

    const year =
      getVehicleYear(vehicle);

    const site =
      getVehicleSite(vehicle);

    const assetStatus =
      normalise(
        vehicle.assetStatus,
      );

    const underRepair =
      assetStatus ===
      'UNDER_REPAIR';

    return (
      <View style={styles.card}>
        <View
          style={
            styles.cardHeader
          }
        >
          <View
            style={
              styles.cardHeading
            }
          >
            <Text
              style={
                styles.registration
              }
            >
              {
                vehicle.registrationNo
              }
            </Text>

            <Text
              style={
                styles.makeModel
              }
            >
              {makeModel}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              underRepair
                ? styles.statusWarning
                : styles.statusGood,
            ]}
          >
            <Text
              style={
                styles.statusText
              }
            >
              {labelStatus(
                vehicle.assetStatus,
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.detailsGrid
          }
        >
          <View
            style={
              styles.detailItem
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Asset No
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {vehicle.assetNo}
            </Text>
          </View>

          <View
            style={
              styles.detailItem
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Site
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {site}
            </Text>
          </View>

          {year ? (
            <View
              style={
                styles.detailItem
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Year
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {year}
              </Text>
            </View>
          ) : null}

          {vehicle.serialNumber ? (
            <View
              style={
                styles.detailItem
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Serial / Chassis
              </Text>

              <Text
                style={
                  styles.detailValue
                }
                numberOfLines={1}
              >
                {
                  vehicle.serialNumber
                }
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={
            styles.profilePanel
          }
        >
          <View>
            <Text
              style={
                styles.profileLabel
              }
            >
              Fleet Profile
            </Text>

            <Text
              style={
                vehicle.hasFleetProfile
                  ? styles.profileReady
                  : styles.profilePending
              }
            >
              {vehicle.hasFleetProfile
                ? 'ACTIVE'
                : 'NOT YET CONFIGURED'}
            </Text>
          </View>

          {vehicle.hasFleetProfile ? (
            <Text
              style={
                styles.transactionReady
              }
            >
              Fleet transactions enabled
            </Text>
          ) : (
            <Text
              style={
                styles.transactionPending
              }
            >
              View only
            </Text>
          )}
        </View>

        {vehicle.hasFleetProfile &&
        vehicle.odometerCurrent !=
          null ? (
          <View
            style={
              styles.odometerRow
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Current Odometer
            </Text>

            <Text
              style={
                styles.odometerValue
              }
            >
              {Number(
                vehicle.odometerCurrent,
              ).toLocaleString()}
              {' km'}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) =>
          item.assetId
        }
        renderItem={
          renderVehicle
        }
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              void loadVehicles(
                true,
              )
            }
          />
        }
        ListHeaderComponent={
          <>
            <View
              style={
                styles.topRow
              }
            >
              <Pressable
                style={
                  styles.backButton
                }
                onPress={() =>
                  router.back()
                }
              >
                <Text
                  style={
                    styles.backButtonText
                  }
                >
                  ← Back
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.dashboardButton
                }
                onPress={() =>
                  router.push(
                    '/dashboard',
                  )
                }
              >
                <Text
                  style={
                    styles.dashboardButtonText
                  }
                >
                  Dashboard
                </Text>
              </Pressable>
            </View>

            <Text
              style={
                styles.eyebrow
              }
            >
              FLEET MANAGEMENT
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Vehicle Directory
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Company vehicle
              register from the
              Southin Asset Master.
            </Text>

            <View
              style={
                styles.summaryGrid
              }
            >
              <View
                style={
                  styles.summaryCard
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Vehicles
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {summary.total}
                </Text>
              </View>

              <View
                style={
                  styles.summaryCard
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Active
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {summary.active}
                </Text>
              </View>

              <View
                style={
                  styles.summaryCard
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Repair
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    summary.underRepair
                  }
                </Text>
              </View>

              <View
                style={
                  styles.summaryCard
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Fleet Ready
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    summary.fleetReady
                  }
                </Text>
              </View>
            </View>

            <TextInput
              style={
                styles.searchInput
              }
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search registration, asset no, make, model, site..."
              placeholderTextColor="#748196"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View
              style={
                styles.filters
              }
            >
              {(
                [
                  [
                    'ALL',
                    'All',
                  ],
                  [
                    'ACTIVE',
                    'Active',
                  ],
                  [
                    'UNDER_REPAIR',
                    'Repair',
                  ],
                  [
                    'FLEET_READY',
                    'Fleet Ready',
                  ],
                ] as Array<
                  [
                    VehicleFilter,
                    string,
                  ]
                >
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.filterButton,
                      filter ===
                        value &&
                        styles.filterButtonActive,
                    ]}
                    onPress={() =>
                      setFilter(
                        value,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filter ===
                          value &&
                          styles.filterTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <View
              style={
                styles.resultRow
              }
            >
              <Text
                style={
                  styles.resultText
                }
              >
                {
                  filteredVehicles.length
                }{' '}
                vehicle
                {filteredVehicles.length ===
                1
                  ? ''
                  : 's'}{' '}
                shown
              </Text>
            </View>

            {error ? (
              <View
                style={
                  styles.errorPanel
                }
              >
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>

                <Pressable
                  onPress={() =>
                    void loadVehicles()
                  }
                >
                  <Text
                    style={
                      styles.retryText
                    }
                  >
                    Try again
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? (
              <View
                style={
                  styles.loadingPanel
                }
              >
                <ActivityIndicator />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Loading vehicle
                  register...
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={
                styles.emptyPanel
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                No vehicles found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Change the search
                or filter and try
                again.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View
            style={
              styles.footer
            }
          >
            <Text
              style={
                styles.footerTitle
              }
            >
              Fleet Operations
            </Text>

            <Text
              style={
                styles.footerText
              }
            >
              Fuel, trips,
              inspections and
              defects require an
              activated Fleet
              profile for the
              selected vehicle.
            </Text>

            <View
              style={
                styles.operationGrid
              }
            >
              <Pressable
                style={
                  styles.operationButton
                }
                onPress={() =>
                  router.push(
                    '/fleet/fuel',
                  )
                }
              >
                <Text
                  style={
                    styles.operationText
                  }
                >
                  Fuel Logs
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.operationButton
                }
                onPress={() =>
                  router.push(
                    '/fleet/trips',
                  )
                }
              >
                <Text
                  style={
                    styles.operationText
                  }
                >
                  Trips
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.operationButton
                }
                onPress={() =>
                  router.push(
                    '/fleet/inspections',
                  )
                }
              >
                <Text
                  style={
                    styles.operationText
                  }
                >
                  Inspections
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.operationButton
                }
                onPress={() =>
                  router.push(
                    '/fleet/defects',
                  )
                }
              >
                <Text
                  style={
                    styles.operationText
                  }
                >
                  Defects
                </Text>
              </Pressable>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        '#F3F6FA',
    },

    content: {
      padding: 18,
      paddingBottom: 40,
    },

    topRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },

    backButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor:
        '#E7EDF5',
    },

    backButtonText: {
      color: '#081A33',
      fontWeight: '700',
    },

    dashboardButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor:
        '#071B38',
    },

    dashboardButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    eyebrow: {
      color: '#F06423',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.1,
      marginBottom: 6,
    },

    title: {
      color: '#071B38',
      fontSize: 30,
      fontWeight: '800',
    },

    subtitle: {
      marginTop: 6,
      marginBottom: 18,
      color: '#536176',
      fontSize: 14,
      lineHeight: 20,
    },

    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 18,
    },

    summaryCard: {
      width: '48%',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor:
        '#D8E0EA',
    },

    summaryLabel: {
      color: '#677489',
      fontSize: 11,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    summaryValue: {
      color: '#071B38',
      fontSize: 24,
      fontWeight: '800',
      marginTop: 4,
    },

    searchInput: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#C9D4E2',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: '#071B38',
      fontSize: 15,
      marginBottom: 12,
    },

    filters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },

    filterButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor:
        '#E8EDF4',
    },

    filterButtonActive: {
      backgroundColor:
        '#071B38',
    },

    filterText: {
      color: '#405069',
      fontSize: 12,
      fontWeight: '700',
    },

    filterTextActive: {
      color: '#FFFFFF',
    },

    resultRow: {
      marginBottom: 12,
    },

    resultText: {
      color: '#677489',
      fontSize: 12,
      fontWeight: '600',
    },

    loadingPanel: {
      paddingVertical: 24,
      alignItems: 'center',
      gap: 10,
    },

    loadingText: {
      color: '#677489',
    },

    errorPanel: {
      borderRadius: 12,
      padding: 14,
      backgroundColor:
        '#FFF0EC',
      marginBottom: 12,
    },

    errorText: {
      color: '#A73B1B',
      fontWeight: '600',
    },

    retryText: {
      marginTop: 8,
      color: '#F06423',
      fontWeight: '800',
    },

    card: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        '#D8E0EA',
    },

    cardHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      gap: 10,
    },

    cardHeading: {
      flex: 1,
    },

    registration: {
      color: '#071B38',
      fontSize: 20,
      fontWeight: '800',
    },

    makeModel: {
      color: '#56657A',
      fontSize: 13,
      marginTop: 3,
    },

    statusBadge: {
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 9,
    },

    statusGood: {
      backgroundColor:
        '#E1F6E8',
    },

    statusWarning: {
      backgroundColor:
        '#FFF0DB',
    },

    statusText: {
      color: '#20354C',
      fontSize: 10,
      fontWeight: '800',
    },

    detailsGrid: {
      marginTop: 15,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    detailItem: {
      minWidth: '45%',
      flex: 1,
    },

    detailLabel: {
      color: '#8390A2',
      fontSize: 10,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    detailValue: {
      color: '#172A43',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 3,
    },

    profilePanel: {
      marginTop: 16,
      backgroundColor:
        '#F6F8FB',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 12,
    },

    profileLabel: {
      color: '#8290A2',
      fontSize: 10,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    profileReady: {
      color: '#16833B',
      marginTop: 3,
      fontWeight: '800',
      fontSize: 12,
    },

    profilePending: {
      color: '#D35B1F',
      marginTop: 3,
      fontWeight: '800',
      fontSize: 12,
    },

    transactionReady: {
      color: '#16833B',
      fontSize: 11,
      fontWeight: '700',
    },

    transactionPending: {
      color: '#7B8797',
      fontSize: 11,
      fontWeight: '700',
    },

    odometerRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      paddingTop: 12,
    },

    odometerValue: {
      color: '#071B38',
      fontSize: 14,
      fontWeight: '800',
    },

    emptyPanel: {
      paddingVertical: 40,
      alignItems: 'center',
    },

    emptyTitle: {
      color: '#071B38',
      fontWeight: '800',
      fontSize: 17,
    },

    emptyText: {
      color: '#758397',
      marginTop: 5,
    },

    footer: {
      marginTop: 16,
      backgroundColor:
        '#071B38',
      borderRadius: 16,
      padding: 16,
    },

    footerTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },

    footerText: {
      color: '#C7D1DE',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
      marginBottom: 14,
    },

    operationGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    operationButton: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },

    operationText: {
      color: '#071B38',
      fontSize: 12,
      fontWeight: '800',
    },
  });