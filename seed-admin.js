/**
 * FastMotion - Database Seed Script
 * Seeds: Super Admin + admin roles + sample rider + pricing data
 *
 * Usage: node seed-admin.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// ── Configuration ─────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

// ── All Permission Enums ─────────────────────────────────
const PERMISSIONS = {
  DELIVERY_VIEW: 'delivery:view',
  DELIVERY_MANAGE: 'delivery:manage',
  DELIVERY_CANCEL: 'delivery:cancel',
  DELIVERY_OVERRIDE_PIN: 'delivery:override_pin',
  RIDER_VIEW: 'rider:view',
  RIDER_CREATE: 'rider:create',
  RIDER_EDIT: 'rider:edit',
  RIDER_SUSPEND: 'rider:suspend',
  RIDER_VERIFY: 'rider:verify',
  RIDER_ASSIGN_DELIVERY: 'rider:assign_delivery',
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_SUSPEND: 'user:suspend',
  FINANCE_VIEW: 'finance:view',
  FINANCE_REFUND: 'finance:refund',
  FINANCE_PRICE_ADJUST: 'finance:price_adjust',
  FINANCE_EARNINGS: 'finance:earnings',
  PRICING_VIEW: 'pricing:view',
  PRICING_MANAGE: 'pricing:manage',
  DISPUTE_VIEW: 'dispute:view',
  DISPUTE_MANAGE: 'dispute:manage',
  ADMIN_VIEW: 'admin:view',
  ADMIN_CREATE: 'admin:create',
  ADMIN_EDIT: 'admin:edit',
  ADMIN_DELETE: 'admin:delete',
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ── Role permission mappings ─────────────────────────────
const ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS,

  admin: [
    PERMISSIONS.DELIVERY_VIEW,
    PERMISSIONS.DELIVERY_MANAGE,
    PERMISSIONS.DELIVERY_CANCEL,
    PERMISSIONS.DELIVERY_OVERRIDE_PIN,
    PERMISSIONS.RIDER_VIEW,
    PERMISSIONS.RIDER_CREATE,
    PERMISSIONS.RIDER_EDIT,
    PERMISSIONS.RIDER_SUSPEND,
    PERMISSIONS.RIDER_VERIFY,
    PERMISSIONS.RIDER_ASSIGN_DELIVERY,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_SUSPEND,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_REFUND,
    PERMISSIONS.FINANCE_PRICE_ADJUST,
    PERMISSIONS.PRICING_VIEW,
    PERMISSIONS.PRICING_MANAGE,
    PERMISSIONS.DISPUTE_VIEW,
    PERMISSIONS.DISPUTE_MANAGE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
  ],

  operations_manager: [
    PERMISSIONS.DELIVERY_VIEW,
    PERMISSIONS.DELIVERY_MANAGE,
    PERMISSIONS.DELIVERY_CANCEL,
    PERMISSIONS.RIDER_VIEW,
    PERMISSIONS.RIDER_ASSIGN_DELIVERY,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.DISPUTE_VIEW,
    PERMISSIONS.DISPUTE_MANAGE,
    PERMISSIONS.REPORT_VIEW,
  ],

  fleet_manager: [
    PERMISSIONS.RIDER_VIEW,
    PERMISSIONS.RIDER_CREATE,
    PERMISSIONS.RIDER_EDIT,
    PERMISSIONS.RIDER_SUSPEND,
    PERMISSIONS.RIDER_VERIFY,
    PERMISSIONS.RIDER_ASSIGN_DELIVERY,
    PERMISSIONS.DELIVERY_VIEW,
    PERMISSIONS.DELIVERY_MANAGE,
    PERMISSIONS.REPORT_VIEW,
  ],

  support_agent: [
    PERMISSIONS.DELIVERY_VIEW,
    PERMISSIONS.DELIVERY_OVERRIDE_PIN,
    PERMISSIONS.RIDER_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.DISPUTE_VIEW,
    PERMISSIONS.DISPUTE_MANAGE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_REFUND,
  ],

  finance_manager: [
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_REFUND,
    PERMISSIONS.FINANCE_PRICE_ADJUST,
    PERMISSIONS.FINANCE_EARNINGS,
    PERMISSIONS.PRICING_VIEW,
    PERMISSIONS.PRICING_MANAGE,
    PERMISSIONS.DELIVERY_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],
};

// ── Helpers ──────────────────────────────────────────────
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  return { salt, hash };
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('fastmotion');
    const adminsCollection = db.collection('admins');
    const ridersCollection = db.collection('riders');
    const pricingConfigCollection = db.collection('pricing_config');
    const locationZonesCollection = db.collection('location_zones');
    const weightPricingCollection = db.collection('weight_pricing');
    const timePricingCollection = db.collection('time_pricing');

    // ══════════════════════════════════════════
    //  1. SEED ADMINS
    // ══════════════════════════════════════════

    const existingSuperAdmin = await adminsCollection.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:', existingSuperAdmin.email);
    } else {
      const superAdminPwd = await hashPassword('Password@123');
      const superAdminId = new ObjectId();

      await adminsCollection.insertOne({
        _id: superAdminId,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@fastmotion.com',
        phone: '+2340000000001',
        passwordHash: superAdminPwd.hash,
        passwordSalt: superAdminPwd.salt,
        role: 'super_admin',
        permissions: ALL_PERMISSIONS,
        isActive: true,
        isEmailConfirmed: true,
        mustChangePassword: false,
        loginFailedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Super Admin created: superadmin@fastmotion.com / Password@123');

      const sampleAdmins = [
        { firstName: 'Admin', lastName: 'User', email: 'admin@fastmotion.com', phone: '+2340000000002', role: 'admin' },
        {
          firstName: 'Ops',
          lastName: 'Manager',
          email: 'ops@fastmotion.com',
          phone: '+2340000000003',
          role: 'operations_manager',
        },
        {
          firstName: 'Fleet',
          lastName: 'Manager',
          email: 'fleet@fastmotion.com',
          phone: '+2340000000004',
          role: 'fleet_manager',
        },
        {
          firstName: 'Support',
          lastName: 'Agent',
          email: 'support@fastmotion.com',
          phone: '+2340000000005',
          role: 'support_agent',
        },
        {
          firstName: 'Finance',
          lastName: 'Manager',
          email: 'finance@fastmotion.com',
          phone: '+2340000000006',
          role: 'finance_manager',
        },
      ];

      for (const adminData of sampleAdmins) {
        const pwd = await hashPassword('Password@123');
        await adminsCollection.insertOne({
          _id: new ObjectId(),
          ...adminData,
          passwordHash: pwd.hash,
          passwordSalt: pwd.salt,
          permissions: ROLE_PERMISSIONS[adminData.role] || [],
          isActive: true,
          isEmailConfirmed: true,
          mustChangePassword: true,
          loginFailedCount: 0,
          createdBy: superAdminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ ${adminData.role} created: ${adminData.email}`);
      }
    }

    // ══════════════════════════════════════════
    //  2. SEED SAMPLE RIDER
    // ══════════════════════════════════════════

    const existingRider = await ridersCollection.findOne({ email: 'rider1@fastmotion.com' });

    if (existingRider) {
      console.log('\n⚠️  Sample rider already exists:', existingRider.email);
    } else {
      const riderPwd = await hashPassword('Password@123');
      await ridersCollection.insertOne({
        _id: new ObjectId(),
        firstName: 'Emeka',
        lastName: 'Okafor',
        email: 'rider1@fastmotion.com',
        phone: '+2348011111111',
        passwordHash: riderPwd.hash,
        passwordSalt: riderPwd.salt,
        gender: 'male',
        vehicleType: 'motorcycle',
        vehiclePlateNumber: 'LAG-FM-001',
        vehicleModel: 'Honda ACE 125',
        vehicleColor: 'Black',
        status: 'offline',
        verificationStatus: 'verified',
        isActive: true,
        isOnline: false,
        isEmailConfirmed: true,
        isPhoneConfirmed: true,
        enforceDeviceBinding: true,
        isVehicleBound: false,
        canAcceptOutsideZone: true,
        allowContactSharing: false,
        isSuspended: false,
        maxConcurrentDeliveries: 1,
        currentDeliveryCount: 0,
        totalDeliveries: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalRatings: 0,
        assignedZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('\n✅ Sample rider created: rider1@fastmotion.com / Password@123');
    }

    // ══════════════════════════════════════════
    //  3. SEED PRICING CONFIG
    // ══════════════════════════════════════════

    const existingConfig = await pricingConfigCollection.findOne({ isActive: true });

    if (existingConfig) {
      console.log('\n⚠️  Active pricing config already exists, skipping pricing seed');
    } else {
      console.log('\n── Seeding Pricing Data ──');

      // 3a. Pricing Config
      await pricingConfigCollection.insertOne({
        _id: new ObjectId(),
        currency: 'NGN',
        currencySymbol: '₦',
        baseDeliveryFee: 500,
        pricePerKm: 100,
        pricePerMinute: 0,
        minimumDeliveryFee: 700,
        maximumDeliveryFee: 50000,
        quickDeliveryMultiplier: 1.2,
        scheduledDeliveryMultiplier: 1.0,
        interZoneMultiplier: 1.3,
        serviceFeePercentage: 0.05,
        minimumServiceFee: 100,
        maximumServiceFee: 2000,
        parcelProtectionPercentage: 0.01,
        cancellationFeeBeforeAccept: 0,
        cancellationFeeAfterAccept: 300,
        cancellationFeeAfterPickupPercentage: 0.5,
        reschedulingFee: 200,
        isActive: true,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Pricing config created (base=₦500, ₦100/km, quick=1.2x, scheduled=1.0x)');

      // 3b. Location Zones (Abuja-centric)
      const zones = [
        {
          _id: new ObjectId(),
          name: 'Central Business District',
          code: 'ABJ-CBD',
          description: 'Abuja Central Business District and surroundings',
          centerPoint: { latitude: 9.0579, longitude: 7.4951 },
          radiusKm: 8,
          priceMultiplier: 1.0,
          baseFee: 0,
          priority: 10,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Wuse',
          code: 'ABJ-WUSE',
          description: 'Wuse Zone 1-7 and Wuse 2',
          centerPoint: { latitude: 9.0764, longitude: 7.47 },
          radiusKm: 5,
          priceMultiplier: 1.0,
          baseFee: 0,
          priority: 8,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Garki',
          code: 'ABJ-GARKI',
          description: 'Garki Area 1-11',
          centerPoint: { latitude: 9.03, longitude: 7.49 },
          radiusKm: 5,
          priceMultiplier: 1.0,
          baseFee: 0,
          priority: 8,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Maitama / Asokoro',
          code: 'ABJ-MAITAMA',
          description: 'Maitama, Asokoro, and surrounding highbrow areas',
          centerPoint: { latitude: 9.0833, longitude: 7.5139 },
          radiusKm: 5,
          priceMultiplier: 1.2,
          baseFee: 200,
          priority: 9,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Gwarinpa / Kubwa',
          code: 'ABJ-GWARINPA',
          description: 'Gwarinpa, Kubwa, and northern suburbs',
          centerPoint: { latitude: 9.15, longitude: 7.4 },
          radiusKm: 10,
          priceMultiplier: 1.3,
          baseFee: 300,
          priority: 5,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Lugbe / Airport Road',
          code: 'ABJ-LUGBE',
          description: 'Lugbe, Airport Road corridor, and surroundings',
          centerPoint: { latitude: 8.98, longitude: 7.42 },
          radiusKm: 8,
          priceMultiplier: 1.4,
          baseFee: 400,
          priority: 4,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Nyanya / Karu',
          code: 'ABJ-NYANYA',
          description: 'Nyanya, Karu, Jikwoyi satellite towns',
          centerPoint: { latitude: 9.01, longitude: 7.57 },
          radiusKm: 8,
          priceMultiplier: 1.5,
          baseFee: 500,
          priority: 3,
          status: 'active',
          allowInterZoneDelivery: true,
          linkedZones: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Link all zones to each other for inter-zone delivery
      const allZoneIds = zones.map((z) => z._id);
      zones.forEach((z) => {
        z.linkedZones = allZoneIds.filter((id) => !id.equals(z._id));
      });

      await locationZonesCollection.insertMany(zones);
      console.log(`✅ ${zones.length} location zones created (Abuja areas)`);

      // 3c. Weight Pricing Tiers
      const weightTiers = [
        {
          _id: new ObjectId(),
          name: 'Light (Documents & Small Items)',
          minWeightKg: 0,
          maxWeightKg: 2,
          priceMultiplier: 1.0,
          additionalFee: 0,
          description: 'Documents, envelopes, small items under 2kg',
          sortOrder: 1,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Standard (Small Parcels)',
          minWeightKg: 2,
          maxWeightKg: 5,
          priceMultiplier: 1.1,
          additionalFee: 200,
          description: 'Small parcels 2-5kg',
          sortOrder: 2,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Medium (Regular Parcels)',
          minWeightKg: 5,
          maxWeightKg: 10,
          priceMultiplier: 1.3,
          additionalFee: 500,
          description: 'Regular parcels 5-10kg',
          sortOrder: 3,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Heavy (Large Parcels)',
          minWeightKg: 10,
          maxWeightKg: 20,
          priceMultiplier: 1.5,
          additionalFee: 1000,
          description: 'Heavy parcels 10-20kg',
          sortOrder: 4,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Extra Heavy',
          minWeightKg: 20,
          maxWeightKg: 50,
          priceMultiplier: 2.0,
          additionalFee: 2000,
          description: 'Very heavy items 20-50kg',
          sortOrder: 5,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await weightPricingCollection.insertMany(weightTiers);
      console.log(`✅ ${weightTiers.length} weight pricing tiers created`);

      // 3d. Time Pricing Slots
      const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const weekends = ['saturday', 'sunday'];

      const timeSlots = [
        {
          _id: new ObjectId(),
          name: 'Early Morning',
          startTime: '06:00',
          endTime: '07:00',
          daysOfWeek: allDays,
          priceMultiplier: 1.1,
          additionalFee: 100,
          description: 'Early morning deliveries',
          isPeakPeriod: false,
          isDeliveryAvailable: true,
          priority: 1,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Morning Rush Hour',
          startTime: '07:00',
          endTime: '09:30',
          daysOfWeek: weekdays,
          priceMultiplier: 1.4,
          additionalFee: 200,
          description: 'Peak morning traffic hours on weekdays',
          isPeakPeriod: true,
          isDeliveryAvailable: true,
          priority: 5,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Daytime Standard',
          startTime: '09:30',
          endTime: '16:00',
          daysOfWeek: allDays,
          priceMultiplier: 1.0,
          additionalFee: 0,
          description: 'Normal daytime rates',
          isPeakPeriod: false,
          isDeliveryAvailable: true,
          priority: 1,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Evening Rush Hour',
          startTime: '16:00',
          endTime: '19:00',
          daysOfWeek: weekdays,
          priceMultiplier: 1.3,
          additionalFee: 150,
          description: 'Peak evening traffic hours on weekdays',
          isPeakPeriod: true,
          isDeliveryAvailable: true,
          priority: 5,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Evening Standard',
          startTime: '19:00',
          endTime: '21:00',
          daysOfWeek: allDays,
          priceMultiplier: 1.1,
          additionalFee: 100,
          description: 'Evening deliveries',
          isPeakPeriod: false,
          isDeliveryAvailable: true,
          priority: 1,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Night Hours',
          startTime: '21:00',
          endTime: '23:59',
          daysOfWeek: allDays,
          priceMultiplier: 1.5,
          additionalFee: 300,
          description: 'Late night deliveries with higher rates',
          isPeakPeriod: false,
          isDeliveryAvailable: true,
          priority: 1,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Weekend Morning',
          startTime: '07:00',
          endTime: '09:30',
          daysOfWeek: weekends,
          priceMultiplier: 1.1,
          additionalFee: 50,
          description: 'Weekend morning — no rush hour premium',
          isPeakPeriod: false,
          isDeliveryAvailable: true,
          priority: 3,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          name: 'Weekend Afternoon',
          startTime: '16:00',
          endTime: '19:00',
          daysOfWeek: weekends,
          priceMultiplier: 1.1,
          additionalFee: 50,
          description: 'Weekend afternoon — no rush hour premium',
          isPeakPeriod: false,
          isDeliveryAvailable: true,
          priority: 3,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await timePricingCollection.insertMany(timeSlots);
      console.log(`✅ ${timeSlots.length} time pricing slots created`);
    }

    // ══════════════════════════════════════════
    //  SUMMARY
    // ══════════════════════════════════════════

    const adminCount = await adminsCollection.countDocuments();
    const riderCount = await ridersCollection.countDocuments();
    const configCount = await pricingConfigCollection.countDocuments({ isActive: true });
    const zoneCount = await locationZonesCollection.countDocuments({ status: 'active' });
    const weightCount = await weightPricingCollection.countDocuments({ status: 'active' });
    const timeCount = await timePricingCollection.countDocuments({ status: 'active' });

    console.log('\n════════════════════════════════════════');
    console.log('  SEED COMPLETE');
    console.log('════════════════════════════════════════');
    console.log(`  Admins:          ${adminCount}`);
    console.log(`  Riders:          ${riderCount}`);
    console.log(`  Pricing Config:  ${configCount} active`);
    console.log(`  Location Zones:  ${zoneCount} active`);
    console.log(`  Weight Tiers:    ${weightCount} active`);
    console.log(`  Time Slots:      ${timeCount} active`);
    console.log('');
    console.log('  Admin Roles:');
    console.log('    • super_admin       — superadmin@fastmotion.com');
    console.log('    • admin             — admin@fastmotion.com');
    console.log('    • operations_mgr    — ops@fastmotion.com');
    console.log('    • fleet_manager     — fleet@fastmotion.com');
    console.log('    • support_agent     — support@fastmotion.com');
    console.log('    • finance_manager   — finance@fastmotion.com');
    console.log('');
    console.log('  Sample Rider:');
    console.log('    • rider1@fastmotion.com / Password@123');
    console.log('');
    console.log('  Pricing Summary:');
    console.log('    • Base fee: ₦500 + ₦100/km');
    console.log('    • Quick delivery: 1.2x multiplier');
    console.log('    • Scheduled: 1.0x (no premium)');
    console.log('    • Inter-zone: 1.3x multiplier');
    console.log('    • Service fee: 5% (min ₦100, max ₦2,000)');
    console.log('    • Rush hour (weekdays 7-9:30am, 4-7pm): 1.3-1.4x');
    console.log('    • Night (9pm+): 1.5x');
    console.log('');
    console.log('  All passwords: Password@123');
    console.log('════════════════════════════════════════');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

main().catch(console.error);
