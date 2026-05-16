import {
  Table,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  Input,
  Checkbox,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { disciplinesService } from "../services/disciplines";
import { membersService } from "../services/members";
import type { DisciplineDTO, CreateDisciplineRequest, MemberDTO } from "@alentapp/shared";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  createListCollection,
} from "../components/ui/select";

export function DisciplinesView() {
  const [disciplines, setDisciplines] = useState<DisciplineDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateDisciplineRequest>({
    reason: "",
    issue_date: "",
    expiry_date: "",
    is_total_suspension: false,
    member_id: "",
  });

  const membersCollection = createListCollection({
    items: members.map((m) => ({ label: m.name, value: m.id })),
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [disciplinesData, membersData] = await Promise.all([
        disciplinesService.getAll(),
        membersService.getAll(),
      ]);
      setDisciplines(disciplinesData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      reason: "",
      issue_date: "",
      expiry_date: "",
      is_total_suspension: false,
      member_id: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await disciplinesService.create(formData);
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error al guardar la sanción");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.name ?? memberId;
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Sanciones Disciplinarias</Heading>
            <Text color="fg.muted" fontSize="md">
              Registro de suspensiones y sanciones de los miembros del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Nueva Sanción
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Nueva Sanción Disciplinaria</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Miembro" required>
                  <SelectRoot
                    collection={membersCollection}
                    value={formData.member_id ? [formData.member_id] : []}
                    onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione un miembro" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersCollection.items.map((item) => (
                        <SelectItem item={item} key={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
                <Field label="Motivo" required>
                  <Input
                    placeholder="Ej. Conducta indebida en partido"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de inicio" required>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de vencimiento" required>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    required
                  />
                </Field>
                <Checkbox.Root
                  checked={formData.is_total_suspension}
                  onCheckedChange={(e) =>
                    setFormData({ ...formData, is_total_suspension: !!e.checked })
                  }
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Suspensión total</Checkbox.Label>
                </Checkbox.Root>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Crear Sanción
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando sanciones...</Text>
              </Stack>
            </Center>
          ) : disciplines.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron sanciones registradas.</Text>
                <Button variant="ghost" onClick={fetchData}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Miembro</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Motivo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha inicio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Tipo</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {disciplines.map((discipline) => (
                  <Table.Row key={discipline.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {getMemberName(discipline.member_id)}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{discipline.reason}</Table.Cell>
                    <Table.Cell color="fg.muted">{discipline.issue_date}</Table.Cell>
                    <Table.Cell color="fg.muted">{discipline.expiry_date}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={discipline.is_total_suspension ? "red.50" : "orange.50"}
                        color={discipline.is_total_suspension ? "red.700" : "orange.700"}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {discipline.is_total_suspension ? "Total" : "Parcial"}
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
